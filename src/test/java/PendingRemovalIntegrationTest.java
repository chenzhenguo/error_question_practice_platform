import org.junit.Test;
import static org.junit.Assert.*;
import java.util.*;

/**
 * 待移除审计集成测试（逻辑验证）
 * 说明：此处使用 Java 单元测试类对关键逻辑进行验证（置顶排序、最终移除、回归队列），
 * 以便在代码审阅时明确预期行为。测试数据结构使用 Map/List 简化模拟。
 */
public class PendingRemovalIntegrationTest {

    /**
     * 工具：根据待移除 ID，将错题练习集置顶待移除项（与前端 startPractice 中策略一致）
     */
    private List<Map<String, Object>> reorderForAudit(List<Map<String, Object>> practiceQuestions, Set<String> pendingIds){
        List<Map<String, Object>> pendings = new ArrayList<>();
        List<Map<String, Object>> others = new ArrayList<>();
        for (Map<String, Object> q : practiceQuestions){
            String id = String.valueOf(q.get("id"));
            if (pendingIds.contains(id)) pendings.add(q); else others.add(q);
        }
        List<Map<String, Object>> out = new ArrayList<>(pendings);
        out.addAll(others);
        return out;
    }

    /**
     * 测试：待移除条目置顶排序
     */
    @Test
    public void testPendingItemsMoveToFront(){
        // 中文注释：构造练习集与待移除列表
        List<Map<String, Object>> practice = new ArrayList<>();
        practice.add(new HashMap<String, Object>(){{ put("id","A"); }});
        practice.add(new HashMap<String, Object>(){{ put("id","B"); }});
        practice.add(new HashMap<String, Object>(){{ put("id","C"); }});
        Set<String> pending = new HashSet<>(Arrays.asList("B","C"));

        List<Map<String, Object>> out = reorderForAudit(practice, pending);
        assertEquals("Pending items should be moved to front", "B", out.get(0).get("id"));
        assertEquals("Pending items should be moved to front", "C", out.get(1).get("id"));
        assertEquals("Others follow after pendings", "A", out.get(2).get("id"));
    }

    /**
     * 工具：最终移除逻辑（模拟 PendingRemovalService.finalRemove）
     */
    private List<Map<String, Object>> finalRemove(List<Map<String, Object>> list, String id){
        List<Map<String, Object>> kept = new ArrayList<>();
        for (Map<String, Object> item : list){
            if (!String.valueOf(item.get("id")).equals(id)) kept.add(item);
        }
        return kept;
    }

    /**
     * 工具：回归错题队列逻辑（模拟 PendingRemovalService.reintegrateOnError）
     */
    private List<Map<String, Object>> reintegrateOnError(List<Map<String, Object>> list, String id){
        for (Map<String, Object> item : list){
            if (String.valueOf(item.get("id")).equals(id)){
                item.put("status", "normal");
                item.put("correctStreak", 0);
                item.put("pendingSince", null);
                int ec = (int) item.getOrDefault("errorCount", 0);
                item.put("errorCount", ec + 1);
                item.put("lastErrorTime", new Date().toString());
                @SuppressWarnings("unchecked") List<String> times = (List<String>) item.get("errorTimes");
                if (times == null) times = new ArrayList<>();
                times.add(new Date().toString());
                item.put("errorTimes", times);
                break;
            }
        }
        return list;
    }

    /**
     * 测试：待移除正确后最终移除
     */
    @Test
    public void testPendingCorrectFinalRemove(){
        List<Map<String, Object>> list = new ArrayList<>();
        list.add(new HashMap<String, Object>(){{ put("id","X"); put("status","pendingRemoval"); }});
        list.add(new HashMap<String, Object>(){{ put("id","Y"); put("status","normal"); }});

        List<Map<String, Object>> after = finalRemove(list, "X");
        assertEquals("X should be removed on correct", 1, after.size());
        assertEquals("Remaining id should be Y", "Y", after.get(0).get("id"));
    }

    /**
     * 测试：待移除错误后回归队列并清零连击
     */
    @Test
    public void testPendingWrongReintegrate(){
        List<Map<String, Object>> list = new ArrayList<>();
        list.add(new HashMap<String, Object>(){{ put("id","P"); put("status","pendingRemoval"); put("correctStreak", 3); put("errorCount", 1); put("errorTimes", new ArrayList<String>()); }});
        list = reintegrateOnError(list, "P");
        Map<String, Object> p = list.get(0);
        assertEquals("Status should be normal after wrong", "normal", p.get("status"));
        assertEquals("Streak should reset to 0", 0, p.get("correctStreak"));
        assertTrue("ErrorCount should increment", ((int)p.get("errorCount")) >= 2);
        assertNotNull("lastErrorTime should be set", p.get("lastErrorTime"));
        @SuppressWarnings("unchecked") List<String> times = (List<String>) p.get("errorTimes");
        assertTrue("errorTimes should append", times != null && times.size() >= 1);
    }
}
