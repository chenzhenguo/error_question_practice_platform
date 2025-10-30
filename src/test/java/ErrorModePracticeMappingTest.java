import org.junit.Test;
import static org.junit.Assert.*;
import java.util.*;

/**
 * 错题模式题目合并映射测试
 * 验证：当错题列表仅包含 id 与统计字段时，能从题库或 eqpp.questions 查找并合并出完整显示所需字段。
 */
public class ErrorModePracticeMappingTest {

    /**
     * 工具：模拟从题库与 eqpp 列表合并错题详情
     */
    private Map<String, Object> mergeOne(Map<String, Object> e, Map<String, Map<String, Object>> qMap, Map<String, Map<String, Object>> eqppMap){
        String id = String.valueOf(e.get("id"));
        Map<String, Object> base = qMap.get(id);
        if (base == null) base = eqppMap.get(id);
        Map<String, Object> out = new HashMap<>();
        if (base != null) out.putAll(base);
        out.putAll(e);
        // 统一正确答案字段
        if (!out.containsKey("correctAnswer") && out.containsKey("answer")){
            out.put("correctAnswer", out.get("answer"));
        }
        return out;
    }

    @Test
    public void testMergeFromQuestionBank(){
        // 中文注释：题库有完整字段，错题仅有 id 与计数
        Map<String, Map<String, Object>> qMap = new HashMap<>();
        Map<String, Object> qb = new HashMap<>();
        qb.put("id","Q1");
        qb.put("content","题干示例");
        qb.put("correctAnswer","A");
        qMap.put("Q1", qb);

        Map<String, Map<String, Object>> eqppMap = new HashMap<>();

        Map<String, Object> err = new HashMap<>();
        err.put("id","Q1");
        err.put("errorCount", 2);
        Map<String, Object> merged = mergeOne(err, qMap, eqppMap);

        assertEquals("Should merge content from question bank", "题干示例", merged.get("content"));
        assertEquals("Should keep correctAnswer", "A", merged.get("correctAnswer"));
        assertEquals("Should carry errorCount", 2, merged.get("errorCount"));
    }

    @Test
    public void testMergeFromEqppList(){
        Map<String, Map<String, Object>> qMap = new HashMap<>();
        Map<String, Map<String, Object>> eqppMap = new HashMap<>();
        Map<String, Object> eq = new HashMap<>();
        eq.put("id","Q2");
        eq.put("question","题干来自eqpp");
        eq.put("answer","B");
        eqppMap.put("Q2", eq);

        Map<String, Object> err = new HashMap<>();
        err.put("id","Q2");
        Map<String, Object> merged = mergeOne(err, qMap, eqppMap);

        assertEquals("Should merge content from eqpp.questions", "题干来自eqpp", merged.get("question"));
        assertEquals("Should map answer to correctAnswer", "B", merged.get("correctAnswer"));
    }
}
