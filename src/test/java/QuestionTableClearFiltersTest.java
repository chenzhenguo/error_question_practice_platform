import org.junit.jupiter.api.*;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.Select;

import java.time.Duration;
import java.util.List;

/**
 * 题库管理筛选清空恢复测试
 * 验证：筛选后点击“清空筛选”按钮应恢复展示全部数据
 */
public class QuestionTableClearFiltersTest {
    private WebDriver driver;

    @BeforeEach
    public void setUp() {
        driver = new ChromeDriver();
        driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(3));
        driver.get("http://127.0.0.1:5501/src/rror_question_practice_platform.html");
        // 进入题库管理页签（如果需要）
        try {
            WebElement tab = driver.findElement(By.id("question-bank-tab"));
            tab.click();
        } catch (NoSuchElementException ignored) {}
    }

    @AfterEach
    public void tearDown() {
        if (driver != null) driver.quit();
    }

    /**
     * 辅助：统计当前可见行数
     */
    private int visibleRowCount() {
        List<WebElement> rows = driver.findElements(By.cssSelector("#question-table-body tr"));
        int cnt = 0;
        for (WebElement r : rows) {
            String cls = r.getAttribute("class");
            if (cls == null || !cls.contains("hidden")) cnt++;
        }
        return cnt;
    }

    @Test
    public void testClearFiltersRestoresAllRows() {
        // 初始行数（至少应有一行示例数据）
        int all = visibleRowCount();
        Assertions.assertTrue(all >= 1, "Initial visible rows should be >= 1");

        // 应用一个筛选：按题型（若下拉存在）
        try {
            WebElement typeSel = driver.findElement(By.id("filter-type"));
            new Select(typeSel).selectByIndex(1); // 选择第一个有效选项（通常为“选择题”）
        } catch (Exception ignored) {}

        // 应用筛选：触发 change
        try { driver.findElement(By.id("filter-type")).sendKeys("\n"); } catch (Exception ignored) {}
        int filtered = visibleRowCount();
        Assertions.assertTrue(filtered <= all, "Filtered count should be <= all");

        // 点击清空筛选
        driver.findElement(By.id("clear-filters")).click();

        // 验证：恢复为全部行
        int restored = visibleRowCount();
        Assertions.assertEquals(all, restored, "Clearing filters should restore all rows");
    }

    @Test
    public void testClearFiltersAfterSearch() {
        int all = visibleRowCount();
        Assertions.assertTrue(all >= 1, "Initial visible rows should be >= 1");

        // 输入搜索关键词，尽量过滤掉所有（使用不匹配的字符串）
        WebElement search = driver.findElement(By.id("search-questions"));
        search.clear();
        search.sendKeys("__no_match__keyword__");

        int none = visibleRowCount();
        Assertions.assertTrue(none == 0 || none < all, "Search should reduce visible rows");

        // 清空筛选
        driver.findElement(By.id("clear-filters")).click();

        // 验证：恢复全部行
        int restored = visibleRowCount();
        Assertions.assertEquals(all, restored, "Clearing filters after search should restore all rows");
    }
}
