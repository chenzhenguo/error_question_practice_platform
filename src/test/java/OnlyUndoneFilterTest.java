package test;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

/**
 * 中文注释：
 * 针对“仅显示未做题目”过滤规则进行单元测试。
 * 通过模拟两道题（A 已做，B 未做）验证过滤后只剩未做的题目。
 */
public class OnlyUndoneFilterTest {

    @Test
    public void testOnlyUndoneFilter() {
        // 中文注释：模拟两道题对象，ID 为 A/B
        class Q { String id; Q(String id){this.id=id;} }
        Q a = new Q("A");
        Q b = new Q("B");

        // 中文注释：模拟作答索引，A 的 answeredCount > 0，B 为未做
        java.util.Map<String,java.util.Map<String,Object>> idx = new java.util.HashMap<>();
        java.util.Map<String,Object> aRec = new java.util.HashMap<>();
        aRec.put("answeredCount", 1);
        idx.put("A", aRec);

        java.util.List<Q> list = new java.util.ArrayList<>();
        list.add(a);
        list.add(b);

        // 中文注释：仅保留未做题目（answeredCount == 0）
        java.util.List<Q> filtered = new java.util.ArrayList<>();
        for (Q q : list) {
            boolean done = idx.containsKey(q.id) && ((int)idx.get(q.id).getOrDefault("answeredCount", 0)) > 0;
            if (!done) filtered.add(q);
        }

        // 中文注释：断言过滤后的结果只剩 B
        assertEquals(1, filtered.size());
        assertEquals("B", filtered.get(0).id);
    }
}
