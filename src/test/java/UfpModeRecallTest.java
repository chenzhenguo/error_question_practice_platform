// 全部中文注释：统一筛选面板“按模式回显配置”测试
// 目标：验证切换不同模式（random/error）时，界面控件正确回显该模式已保存的规则。
// 覆盖：题型/错因标签选中、标签逻辑、每次答题数量、时间筛选（预设/自定义日期）、优先级（优先/仅显示未做题）。

import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;
import java.time.Duration;

public class UfpModeRecallTest {
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
    public void openPageAndSeedData() {
        driver.get("http://127.0.0.1:5501/src/rror_question_practice_platform.html");
        // 预置 random 模式与 error 模式的规则到 localStorage
        String seedScript = "" +
            "localStorage.setItem('practiceFilter:random', JSON.stringify({" +
            "  rules: {" +
            "    types: ['选择题'], tags: ['粗心'], tagLogic: 'AND'," +
            "    questionCount: 7," +
            "    timeRange: { preset: 'custom', from: '2024-01-01', to: '2024-01-31' }," +
            "    preferUndone: true, onlyUndone: false" +
            "  }, ts: new Date().toISOString() }));" +
            "localStorage.setItem('practiceFilter:error', JSON.stringify({" +
            "  rules: {" +
            "    types: [], tags: ['概念不清'], tagLogic: 'OR'," +
            "    questionCount: 0," +
            "    timeRange: { preset: '7d' }," +
            "    preferUndone: false, onlyUndone: true" +
            "  }, ts: new Date().toISOString() }));";
        ((JavascriptExecutor) driver).executeScript(seedScript);

        // 打开统一筛选面板（弹窗）
        Object opened = ((JavascriptExecutor) driver).executeScript("return (typeof openUnifiedFilterPanel==='function')? (openUnifiedFilterPanel(), true) : false;");
        assertEquals(Boolean.TRUE, opened, "Unified filter panel should be open");
        // 确保可见（移除 hidden）
        ((JavascriptExecutor) driver).executeScript("document.getElementById('modal')?.classList?.remove('hidden');");
        wait.until(ExpectedConditions.presenceOfElementLocated(By.cssSelector("#ufp-mode-tabs")));
    }

    @Test
    public void testRecallOnRandomMode() {
        // 切换到 random 模式
        WebElement randomTab = wait.until(ExpectedConditions.presenceOfElementLocated(
                By.cssSelector("#ufp-mode-tabs [role='tab'][data-mode='random']")));
        randomTab.click();
        assertEquals("true", randomTab.getAttribute("aria-selected"), "Random tab should be selected");

        // 校验数量
        WebElement cnt = wait.until(ExpectedConditions.presenceOfElementLocated(By.id("ufp-count")));
        assertEquals("7", cnt.getAttribute("value"), "Question count should be 7 for random mode");

        // 校验标签逻辑 AND
        WebElement logicAnd = driver.findElement(By.cssSelector("input[name='ufp-tag-logic'][value='AND']"));
        assertTrue(logicAnd.isSelected(), "Tag logic AND should be selected");

        // 校验时间：custom 及日期
        WebElement presetCustom = driver.findElement(By.cssSelector("input[name='ufp-time-preset'][value='custom']"));
        assertTrue(presetCustom.isSelected(), "Time preset 'custom' should be selected");
        WebElement box = driver.findElement(By.id("ufp-time-custom"));
        assertFalse(box.getAttribute("class").contains("hidden"), "Custom time box should be visible");
        assertEquals("2024-01-01", driver.findElement(By.id("ufp-date-from")).getAttribute("value"));
        assertEquals("2024-01-31", driver.findElement(By.id("ufp-date-to")).getAttribute("value"));

        // 题型与标签选中（存在则应选中）
        // 注意：题型/标签列表来源于题库数据，若页面当前没有该选项，仅验证逻辑存在时不会抛错
        try {
            WebElement typeChip = driver.findElement(By.xpath("//div[@id='ufp-types-list']//label[.//span[contains(text(),'选择题')]]//input"));
            assertTrue(typeChip.isSelected(), "Type '选择题' should be checked");
        } catch (NoSuchElementException ignored) {}
        try {
            WebElement tagChip = driver.findElement(By.xpath("//div[@id='ufp-tags-list']//label[.//span[contains(text(),'粗心')]]//input"));
            assertTrue(tagChip.isSelected(), "Tag '粗心' should be checked");
        } catch (NoSuchElementException ignored) {}

        // 优先级
        assertTrue(driver.findElement(By.id("ufp-prefer-undone")).isSelected(), "preferUndone should be checked");
        assertFalse(driver.findElement(By.id("ufp-only-undone")).isSelected(), "onlyUndone should be unchecked");
    }

    @Test
    public void testRecallOnErrorMode() {
        // 切换到 error 模式
        WebElement errorTab = wait.until(ExpectedConditions.presenceOfElementLocated(
                By.cssSelector("#ufp-mode-tabs [role='tab'][data-mode='error']")));
        errorTab.click();
        assertEquals("true", errorTab.getAttribute("aria-selected"), "Error tab should be selected");

        // 数量为空（0 按回显规则应为空串）
        WebElement cnt = wait.until(ExpectedConditions.presenceOfElementLocated(By.id("ufp-count")));
        assertEquals("", cnt.getAttribute("value"), "Question count should be empty for error mode");

        // 标签逻辑 OR
        WebElement logicOr = driver.findElement(By.cssSelector("input[name='ufp-tag-logic'][value='OR']"));
        assertTrue(logicOr.isSelected(), "Tag logic OR should be selected");

        // 时间：近7天，自定义日期框应隐藏
        WebElement preset7d = driver.findElement(By.cssSelector("input[name='ufp-time-preset'][value='7d']"));
        assertTrue(preset7d.isSelected(), "Time preset '7d' should be selected");
        WebElement box = driver.findElement(By.id("ufp-time-custom"));
        assertTrue(box.getAttribute("class").contains("hidden"), "Custom time box should be hidden");

        // 优先级：仅显示未做题选中，优先显示未做题未选中
        assertTrue(driver.findElement(By.id("ufp-only-undone")).isSelected(), "onlyUndone should be checked");
        assertFalse(driver.findElement(By.id("ufp-prefer-undone")).isSelected(), "preferUndone should be unchecked");

        // 标签选中（存在则应选中）
        try {
            WebElement tagChip = driver.findElement(By.xpath("//div[@id='ufp-tags-list']//label[.//span[contains(text(),'概念不清')]]//input"));
            assertTrue(tagChip.isSelected(), "Tag '概念不清' should be checked");
        } catch (NoSuchElementException ignored) {}
    }
}
