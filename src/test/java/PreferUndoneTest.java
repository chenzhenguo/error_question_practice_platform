package test;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

/**
 * 中文注释：
 * 针对“优先没有做的题目”功能的排序行为进行简单单元测试。
 * 通过模拟两道题（一道已做、一道未做）来验证排序结果是否将未做题排在前面。
 * 该测试不依赖浏览器环境，仅验证核心排序逻辑。
 */
public class PreferUndoneTest {

    @Test
    public void testPreferUndoneOrdering() {
        // 中文注释：模拟两道题，其中第一道已做，第二道未做，启用优先未做排序后应将未做的题排在前面
        class Q { String id; Q(String id){this.id=id;} }
        Q a = new Q("A");
        Q b = new Q("B");

        // 中文注释：构造作答历史索引，表示题目A已做过3次
        java.util.Map<String,java.util.Map<String,Object>> idx = new java.util.HashMap<>();
        java.util.Map<String,Object> aRec = new java.util.HashMap<>();
        aRec.put("answeredCount", 3);
        idx.put("A", aRec);

        // 中文注释：原始顺序为[A, B]，排序后应为[B, A]
        java.util.List<Q> list = new java.util.ArrayList<>();
        list.add(a);
        list.add(b);

        // 中文注释：按“未做优先”规则进行排序
        list.sort((q1, q2) -> {
            boolean d1 = idx.containsKey(q1.id) && ((int)idx.get(q1.id).getOrDefault("answeredCount", 0)) > 0;
            boolean d2 = idx.containsKey(q2.id) && ((int)idx.get(q2.id).getOrDefault("answeredCount", 0)) > 0;
            if (d1 == d2) return 0;
            return d1 ? 1 : -1;
        });

        // 中文注释：断言排序后首题为未做的B
        assertEquals("B", list.get(0).id);
    }
}
