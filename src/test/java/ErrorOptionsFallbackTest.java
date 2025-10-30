// 中文注释：错题模式选项渲染回退测试
// 目的：当 options 字段缺失时，能从题干内联文本中解析出 A/B/C/D 选项

import org.junit.Test;
import static org.junit.Assert.*;
import java.util.*;

public class ErrorOptionsFallbackTest {
    // 简化版解析器：支持内联 A./B./C./D. 标记解析
    private static class Opt { String key; String text; Opt(String k,String t){ key=k; text=t; } }
    private List<Opt> parse(String raw){
        if (raw == null) return Collections.emptyList();
        String s = raw.replace('\r',' ').replace('\n',' ').trim();
        // 使用与页面近似的标记正则（简化）
        String tokenRegex = "(?:^|[\\s])[\\(（]?([A-F])[\\)）]?[\\.、．，,\\)]?\\s*";
        List<Integer> indices = new ArrayList<>();
        List<String> keys = new ArrayList<>();
        java.util.regex.Pattern p = java.util.regex.Pattern.compile(tokenRegex);
        java.util.regex.Matcher m = p.matcher(s);
        while (m.find()) { indices.add(m.start()); keys.add(m.group(1)); }
        if (indices.size() < 2) return Collections.emptyList();
        List<Opt> out = new ArrayList<>();
        for (int i=0;i<indices.size();i++){
            int startContent = m.regionEnd(); // 不直接可用，改用再次匹配定位
            // 为避免复杂，简单切分：用 key 位置作为段起点，下一 key 位置作为段终点
            int start = indices.get(i);
            int end = (i+1<indices.size()) ? indices.get(i+1) : s.length();
            String seg = s.substring(start, end);
            // 去掉前导标记和空白
            seg = seg.replaceFirst(tokenRegex, "").trim();
            out.add(new Opt(keys.get(i), seg));
        }
        return out;
    }

    @Test
    public void testInlineParse(){
        String content = "This is question stem. A. Apple B. Banana C. Cherry D. Durian";
        List<Opt> opts = parse(content);
        assertEquals(4, opts.size());
        assertEquals("A", opts.get(0).key);
        assertEquals("B", opts.get(1).key);
        assertEquals("C", opts.get(2).key);
        assertEquals("D", opts.get(3).key);
        assertTrue(opts.get(0).text.toLowerCase().contains("apple"));
        assertTrue(opts.get(1).text.toLowerCase().contains("banana"));
    }

    @Test
    public void testNoOptions(){
        String content = "Only stem without options";
        List<Opt> opts = parse(content);
        assertEquals(0, opts.size());
    }
}
