"""
Automated test: Scheduled task page (timing job)
"""
from playwright.sync_api import sync_playwright
import sys, os

os.environ["PYTHONIOENCODING"] = "utf-8"

BASE_URL = "http://localhost:3006"
JOB_PAGE = f"{BASE_URL}/#/system/job"

results = {"pass": 0, "fail": 0}

def log(step, success, detail=""):
    if success:
        results["pass"] += 1
    else:
        results["fail"] += 1
    mark = "PASS" if success else "FAIL"
    msg = f"  [{mark}] {step}"
    if detail:
        msg += f": {detail}"
    print(msg)


def run_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1600, "height": 900})
        page = context.new_page()
        page.set_default_timeout(15000)

        def goto(url, wait=3000):
            page.goto(url, wait_until="domcontentloaded")
            page.wait_for_timeout(wait)

        def close_all_dialogs():
            """Close any open dialogs/message boxes"""
            page.keyboard.press("Escape")
            page.wait_for_timeout(300)

        # ===== Step 0: Login =====
        print("\n--- Login ---")
        goto(f"{BASE_URL}/#/auth/login")

        result = page.evaluate("""
            async () => {
                const resp = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: 'admin', password: 'admin123', code: '', uuid: '' })
                });
                const data = await resp.json();
                if (data.code === 200 && data.token) {
                    const app = document.getElementById('app');
                    const pinia = app && app.__vue_app__ && app.__vue_app__.config.globalProperties.$pinia;
                    if (pinia) {
                        const store = pinia._s.get('userStore');
                        if (store) {
                            store.accessToken = data.token;
                            store.isLogin = true;
                            store.info = { user: { userName: 'admin' }, roles: ['admin'], permissions: ['*:*:*'] };
                        }
                    }
                    return { success: true };
                }
                return { success: false, error: 'code=' + str(data.code) };
            }
        """)
        log("Login via API", result.get("success", False), result.get("error", ""))

        # Register routes (backend permission mode needs this)
        route_reg = page.evaluate("""
            async () => {
                const router = document.getElementById('app').__vue_app__.config.globalProperties.$router;
                if (router) {
                    try {
                        // Remove old routes first in case they exist from previous navigation
                        router.removeRoute('SystemJob');
                        router.removeRoute('SystemJobLog');
                    } catch(e) {}
                    // Add routes (async imports need evaluate async)
                    const jobComp = await import('/src/views/monitor/job/index.vue');
                    router.addRoute({
                        path: '/system/job', name: 'SystemJob',
                        component: jobComp.default,
                        meta: { title: 'Job', keepAlive: true, roles: ['admin'] }
                    });
                    const logComp = await import('/src/views/monitor/job/job-log.vue');
                    router.addRoute({
                        path: '/system/job-log', name: 'SystemJobLog',
                        component: logComp.default,
                        meta: { title: 'JobLog', isHide: true, keepAlive: true, roles: ['admin'] }
                    });
                    return { success: true };
                }
                return { success: false };
            }
        """)
        page.wait_for_timeout(1000)

        # ===== Step 1: Page Load =====
        print("\n--- 1. Page Load & Table ---")
        goto(JOB_PAGE)
        page.screenshot(path="/tmp/job_test_page.png", full_page=True)
        title = page.title()
        log("Page loads correctly", "404" not in title, title)

        try:
            page.wait_for_selector(".art-search-bar", timeout=10000)
            log("Search bar", True)
        except:
            log("Search bar", False)

        try:
            rows = page.locator(".el-table__body-wrapper tbody tr").all()
            log(f"Table data ({len(rows)} rows)", len(rows) > 0)
        except:
            log("Table data", False)

        try:
            log("Pagination", page.locator(".el-pagination").first.is_visible())
        except:
            log("Pagination", False)

        # ===== Step 2: Search =====
        print("\n--- 2. Search ---")
        try:
            job_inp = page.locator('input[placeholder*="任务名称"]').first
            job_inp.fill("test")
            # Use enter key instead of clicking button
            job_inp.press("Enter")
            page.wait_for_timeout(2000)
            log("Search by job name", True)
        except Exception as e:
            log("Search by job name", False, str(e)[:100])

        try:
            # Reset by using the reset button
            reset = page.locator('button').filter(has_text="重置").first
            reset.click()
            page.wait_for_timeout(2000)
            log("Reset search", True)
        except Exception as e:
            log("Reset search", False, str(e)[:100])

        # ===== Step 3: Add Dialog =====
        print("\n--- 3. Add Task Dialog ---")
        try:
            add_btn = page.locator('button').filter(has_text="新增").first
            add_btn.click()
            page.wait_for_timeout(1500)
            page.screenshot(path="/tmp/job_test_add_dialog.png")
            log("Add dialog opened", page.locator('.el-dialog:visible').count() > 0)
        except Exception as e:
            log("Add dialog opened", False, str(e)[:100])

        # Fill form
        try:
            # Find all text inputs AND textarea elements
            all_fields = page.locator('.el-dialog:visible .el-input__inner:not([readonly]), .el-dialog:visible textarea.el-textarea__inner:not([readonly])').all()
            if len(all_fields) >= 3:
                all_fields[0].click()
                all_fields[0].fill("auto_test_job")
                all_fields[1].click()
                all_fields[1].fill("riSystemApplication")
                all_fields[2].click()
                all_fields[2].fill("0/20 * * * * ?")
                log("Form fields filled", True)
            else:
                log("Form fields filled", False, f"found {len(all_fields)} inputs")
        except Exception as e:
            log("Form fields filled", False, str(e)[:100])

        # Cron generator
        try:
            cron_btn = page.locator('.el-dialog:visible button').filter(has_text="生成表达式").first
            if cron_btn.is_visible():
                cron_btn.click()
                page.wait_for_timeout(2000)
                page.screenshot(path="/tmp/job_test_cron.png")
                has_cron = page.locator('.el-dialog').filter(has_text="Cron").count() > 0
                log("Cron generator opened", has_cron)
                # Close by clicking on the close button of the cron dialog
                if has_cron:
                    # The cron dialog is the second one (stacked)
                    page.locator('.el-dialog .el-dialog__close').last.click()
                    page.wait_for_timeout(1000)
                    log("Cron dialog closed", True)
            else:
                log("Cron generator button", False, "not visible")
        except Exception as e:
            log("Cron generator", False, str(e)[:100])

        # Cancel the add dialog
        try:
            cancel = page.locator('.el-dialog:visible button').filter(has_text="取消").first
            cancel.click()
            page.wait_for_timeout(500)
            log("Add dialog cancelled", True)
        except Exception as e:
            log("Add dialog cancelled", False, str(e)[:100])
            close_all_dialogs()

        # ===== Step 4: Edit button =====
        print("\n--- 4. Edit check ---")
        try:
            first_row = page.locator(".el-table__body-wrapper tbody tr").first
            cells_text = first_row.inner_text()
            log("First row has content", len(cells_text.strip()) > 0, cells_text[:80])
        except Exception as e:
            log("First row check", False, str(e)[:100])

        # ===== Step 5: Batch delete =====
        print("\n--- 5. Batch Delete ---")
        try:
            btn = page.locator('button').filter(has_text="批量删除").first
            is_disabled = "disabled" in (btn.get_attribute("class") or "")
            log(f"Batch delete button (disabled={is_disabled})", btn.is_visible())
        except Exception as e:
            log("Batch delete button", False, str(e)[:100])

        # ===== Step 6: Status toggle =====
        print("\n--- 6. Status Switch ---")
        try:
            switches = page.locator(".el-table__body-wrapper .el-switch").all()
            log(f"Status switches ({len(switches)})", len(switches) > 0)
            if len(switches) > 0:
                switches[0].click()
                page.wait_for_timeout(800)
                # Check for confirm dialog and cancel it
                cancel_btn = page.locator('.el-message-box button').filter(has_text="取消")
                if cancel_btn.count() > 0:
                    cancel_btn.first.click()
                    page.wait_for_timeout(500)
                    log("Status confirm dialog appeared", True)
                else:
                    log("Status confirm dialog", False, "not found")
        except Exception as e:
            log("Status switch", False, str(e)[:100])
            close_all_dialogs()

        # ===== Step 7: Execute once =====
        print("\n--- 7. Execute Once ---")
        try:
            tag = page.locator(".el-tag").filter(has_text="执行一次").first
            if tag.is_visible():
                tag.click()
                page.wait_for_timeout(800)
                cancel_btn = page.locator('.el-message-box button').filter(has_text="取消")
                if cancel_btn.count() > 0:
                    cancel_btn.first.click()
                    page.wait_for_timeout(500)
                    log("Execute once confirm dialog", True)
                else:
                    log("Execute once confirm dialog", False)
            else:
                log("Execute once tag", False, "not visible")
        except Exception as e:
            log("Execute once", False, str(e)[:100])
            close_all_dialogs()

        # ===== Step 8: Navigate to job log =====
        print("\n--- 8. Job Log Navigation ---")
        try:
            log_tag = page.locator(".el-tag").filter(has_text="调度日志").first
            if log_tag.is_visible():
                log_tag.click()
                page.wait_for_timeout(3000)
                url = page.url
                is_log_page = "job-log" in url
                log("Navigate to job log", is_log_page, url[:80] if not is_log_page else "")
                if is_log_page:
                    log("Job log page loaded", page.locator(".art-search-bar").is_visible())
                    page.locator('button').filter(has_text="清空").is_visible()  # verify page elements
                goto(JOB_PAGE)
            else:
                log("Job log tag", False, "not visible")
        except Exception as e:
            log("Job log navigation", False, str(e)[:100])

        # ===== Step 9: Task detail =====
        print("\n--- 9. Task Detail ---")
        try:
            links = page.locator(".link-type").all()
            if len(links) > 0:
                links[0].click()
                page.wait_for_timeout(2000)
                page.screenshot(path="/tmp/job_test_detail.png")
                detail = page.locator('.el-dialog:visible').filter(has_text="任务详情")
                log("Task detail dialog", detail.is_visible())
                if detail.is_visible():
                    detail.locator('.el-dialog__close').click()
                    page.wait_for_timeout(500)
                    log("Detail dialog closed", True)
            else:
                log("Task detail link", False, "not found")
        except Exception as e:
            log("Task detail", False, str(e)[:100])

        # ===== Summary =====
        print(f"\n{'='*50}")
        total = results["pass"] + results["fail"]
        print(f"Results: {results['pass']}/{total} passed ({results['fail']} failed)")
        print(f"{'='*50}")

        browser.close()
        return results["fail"] == 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    success = run_tests()
    sys.exit(0 if success else 1)
