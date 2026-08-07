'use client';

/**
 * 通用模块下拉框选择器
 * 用于除总览外的所有模块顶部，提供时间/区域/楼层等维度筛选
 */

interface SelectorOption {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}

export default function ModuleSelector({ selectors }: { selectors: SelectorOption[] }) {
  return (
    <div style={{
      display: 'flex', gap: '16px', alignItems: 'center',
      background: 'var(--bg-panel)', border: '1px solid var(--border-line)',
      borderRadius: '6px', padding: '8px 16px', backdropFilter: 'blur(14px)',
      flexShrink: 0,
    }}>
      {selectors.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', letterSpacing: '1px' }}>{s.label}</span>
          <select
            value={s.value}
            onChange={(e) => s.onChange(e.target.value)}
            style={{
              padding: '4px 10px', fontSize: '11px', fontWeight: 600,
              background: 'var(--bg-panel)', color: 'var(--primary)',
              border: '1px solid var(--border-line)', borderRadius: '4px',
              cursor: 'pointer', outline: 'none',
              fontFamily: 'Rajdhani', letterSpacing: '0.5px',
            }}
          >
            {s.options.map(opt => (
              <option key={opt} value={opt} style={{ background: '#0a1a2e', color: '#e8f4ff' }}>{opt}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
