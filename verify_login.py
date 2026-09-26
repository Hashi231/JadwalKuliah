from playwright.sync_api import sync_playwright
import json

with sync_playwright() as p:
    browser_a = p.chromium.launch(headless=True)
    page_a = browser_a.new_page()
    page_a.goto('http://localhost:8001/')
    page_a.evaluate('localStorage.clear()')
    page_a.click('[data-auth-mode="register"]')
    page_a.fill('#registerUsername', 'androiduser')
    page_a.fill('#registerFullName', 'Android User')
    page_a.select_option('#registerUniversity', 'Universitas Trisakti')
    page_a.fill('#registerNim', '20240001')
    page_a.click('#registerForm .auth-submit')
    page_a.fill('#loginUsername', 'androiduser')
    page_a.fill('#loginPassword', '20240001')
    page_a.click('#loginForm .auth-submit')
    welcome_a = page_a.locator('#welcomeText').text_content()

    browser_b = p.chromium.launch(headless=True)
    page_b = browser_b.new_page()
    page_b.goto('http://localhost:8001/')
    page_b.fill('#loginUsername', 'androiduser')
    page_b.fill('#loginPassword', '20240001')
    page_b.click('#loginForm .auth-submit')
    message_b = page_b.locator('#authMessage').text_content()

    print(json.dumps({'welcomeA': welcome_a, 'messageB': message_b}, ensure_ascii=False))

    browser_a.close()
    browser_b.close()
