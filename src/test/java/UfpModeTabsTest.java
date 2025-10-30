// 全部中文注释：统一筛选面板的“目标模式”Tab 交互测试
// 说明：本测试使用 Selenium WebDriver 验证以下交互行为：
// 1) Tab 按钮点击切换选中态（aria-selected 与样式同步）
// 2) 键盘导航（方向键/Home/End + Enter/Space）可切换选中项
// 3) “应用并保存”读取当前选中模式（通过暴露的 window.__UfpSelectedMode__() 方法校验）
// 注意：运行本测试需本地安装浏览器与 WebDriver（建议 Chrome + chromedriver），并在 IDE/CI 配置好依赖。
// 错误提示为英文以便快速定位：如驱动路径或元素未找到。

import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.interactions.Actions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;
import java.time.Duration;

public class UfpModeTabsTest {
    private static WebDriver driver;
    private static WebDriverWait wait;

    @BeforeAll
    public static void setUpAll() {
        // 如果已在系统 PATH 中配置 chromedriver，可不设置此项；否则请设置绝对路径
        // System.setProperty("webdriver.chrome.driver", "C:/path/to/chromedriver.exe");
        driver = new ChromeDriver();
        wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    @AfterAll
    public static void tearDownAll() {
        if (driver != null) {
            driver.quit();
        }
    }

    @BeforeEach
    public void openPage() {
        // 打开正在运行的本地预览页面
        driver.get("http://127.0.0.1:5501/src/rror_question_practice_platform.html");
        // 如果面板在弹窗中，确保可见（移除 hidden）
        try {
            ((JavascriptExecutor) driver).executeScript("document.getElementById('modal')?.classList?.remove('hidden');");
        } catch (Exception ignored) {}
        // 等待 TabList 渲染
        wait.until(ExpectedConditions.presenceOfElementLocated(By.cssSelector("#ufp-mode-tabs")));
    }

    @Test
    public void testTabClickSelectsMode() {
        // 点击某一模式（如随机）
        WebElement randomTab = wait.until(ExpectedConditions.presenceOfElementLocated(
                By.cssSelector("#ufp-mode-tabs [role='tab'][data-mode='random']")));
        randomTab.click();

        // 校验选中态（aria-selected=true）
        String aria = randomTab.getAttribute("aria-selected");
        assertEquals("true", aria, "Tab should be selected after click");

        // 校验样式：包含选中态类（bg-primary 或 bg-secondary 任一；至少有 text-white 或 border-xxx）
        String clazz = randomTab.getAttribute("class");
        boolean styled = clazz.contains("text-white") && (clazz.contains("bg-primary") || clazz.contains("bg-secondary"));
        assertTrue(styled, "Selected tab should have highlighted styles");
    }

    @Test
    public void testKeyboardNavigationSelectsNextMode() {
        // 聚焦第一个 Tab
        WebElement firstTab = wait.until(ExpectedConditions.presenceOfElementLocated(
                By.cssSelector("#ufp-mode-tabs [role='tab']")));
        new Actions(driver).moveToElement(firstTab).click().perform();

        // 方向键 + 回车选择下一个 Tab
        Actions act = new Actions(driver);
        act.sendKeys(Keys.ARROW_RIGHT).sendKeys(Keys.ENTER).perform();

        // 当前聚焦元素应为下一个 Tab，且选中
        WebElement active = driver.switchTo().activeElement();
        assertEquals("tab", active.getAttribute("role"), "Active element should be a tab after navigation");
        assertEquals("true", active.getAttribute("aria-selected"), "Tab should be selected after Enter");
    }

    @Test
    public void testApplyUsesSelectedMode() {
        // 选择“错题”模式
        WebElement errorTab = wait.until(ExpectedConditions.presenceOfElementLocated(
                By.cssSelector("#ufp-mode-tabs [role='tab'][data-mode='error']")));
        errorTab.click();
        assertEquals("true", errorTab.getAttribute("aria-selected"), "Error mode tab should be selected");

        // 点击“应用并保存”按钮
        WebElement applyBtn = wait.until(ExpectedConditions.elementToBeClickable(By.id("ufp-apply")));
        applyBtn.click();

        // 通过暴露方法校验当前模式（无需依赖存储或后端）
        Object mode = ((JavascriptExecutor) driver).executeScript("return window.__UfpSelectedMode__ ? window.__UfpSelectedMode__() : null;");
        assertEquals("error", mode, "Selected mode should be 'error' after apply");
    }
}
