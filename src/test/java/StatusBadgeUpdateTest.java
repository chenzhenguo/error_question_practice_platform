// 中文注释：状态徽章更新测试
// 目的：验证状态到样式类与文本的映射逻辑，确保 UI 显示符合预期

import org.junit.Test;
import static org.junit.Assert.*;

public class StatusBadgeUpdateTest {
    // 简化版：将状态映射到badge文本与类
    private static class Badge {
        final String text;
        final String cls;
        Badge(String text, String cls){ this.text = text; this.cls = cls; }
    }
    
    // 中文注释：模拟JS中的映射逻辑
    private Badge map(boolean isCorrect, String statusInErrorList){
        String text = "错题";
        String cls = "ml-3 px-2 py-1 text-xs rounded-full bg-red-100 text-red-800";
        if ("pendingRemoval".equals(statusInErrorList)){
            text = "待移除抽查";
            cls = "ml-3 px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800";
        }
        // 正确且已从错题本移除（列表中找不到）
        if (isCorrect && statusInErrorList == null){
            text = "已移除";
            cls = "ml-3 px-2 py-1 text-xs rounded-full bg-green-100 text-green-800";
        }
        return new Badge(text, cls);
    }

    @Test
    public void testNormalError(){
        Badge b = map(false, "normal");
        assertEquals("错题", b.text);
        assertTrue(b.cls.contains("bg-red-100"));
    }

    @Test
    public void testPendingRemoval(){
        Badge b = map(false, "pendingRemoval");
        assertEquals("待移除抽查", b.text);
        assertTrue(b.cls.contains("bg-yellow-100"));
    }

    @Test
    public void testRemovedAfterCorrect(){
        Badge b = map(true, null);
        assertEquals("已移除", b.text);
        assertTrue(b.cls.contains("bg-green-100"));
    }
}
