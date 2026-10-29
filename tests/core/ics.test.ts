import { describe, it, expect, vi, afterEach } from 'vitest'
import { recheckIcs, downloadText } from '../../src/core/ics'

const field = (ics: string, name: string) => ics.split('\r\n').find(l => l.startsWith(name))

describe('recheckIcs', () => {
  it('包含必需字段，行尾为 CRLF', () => {
    const s = recheckIcs('2026-12-05')
    expect(s.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(s.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(s.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/)
    for (const l of ['VERSION:2.0', 'PRODID:', 'BEGIN:VEVENT', 'END:VEVENT', 'BEGIN:VALARM', 'END:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'UID:', 'DTSTAMP:'])
      expect(field(s, l)).toBeDefined()
    expect(field(s, 'SUMMARY:')).toBe('SUMMARY:带孩子眼科复查')
  })
  it('全天事件：DTSTART;VALUE=DATE，DTEND 为次日', () => {
    const s = recheckIcs('2026-12-05')
    expect(field(s, 'DTSTART')).toBe('DTSTART;VALUE=DATE:20261205')
    expect(field(s, 'DTEND')).toBe('DTEND;VALUE=DATE:20261206')
  })
  it('跨月、跨年、闰年', () => {
    expect(field(recheckIcs('2026-11-30'), 'DTEND')).toBe('DTEND;VALUE=DATE:20261201')
    expect(field(recheckIcs('2026-12-31'), 'DTEND')).toBe('DTEND;VALUE=DATE:20270101')
    expect(field(recheckIcs('2028-02-28'), 'DTEND')).toBe('DTEND;VALUE=DATE:20280229')
  })
  it('DTSTAMP 为 UTC 格式', () => {
    expect(field(recheckIcs('2026-12-05'), 'DTSTAMP:')).toMatch(/^DTSTAMP:\d{8}T\d{6}Z$/)
  })
  it('UID 唯一', () => {
    const uids = new Set(Array.from({ length: 50 }, () => field(recheckIcs('2026-12-05'), 'UID:')))
    expect(uids.size).toBe(50)
  })
  it('自定义标题并转义特殊字符', () => {
    expect(field(recheckIcs('2026-12-05', '复查; 省医院, 王医生'), 'SUMMARY:')).toBe('SUMMARY:复查\\; 省医院\\, 王医生')
  })
})

describe('downloadText', () => {
  afterEach(() => { vi.restoreAllMocks() })
  it('用 Blob 生成下载链接并点击', () => {
    const create = vi.fn(() => 'blob:x'); const revoke = vi.fn()
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    downloadText('a.ics', 'hello', 'text/calendar')
    expect(create).toHaveBeenCalledOnce()
    const blob = (create.mock.calls[0] as unknown[])[0] as Blob
    expect(blob.type).toBe('text/calendar')
    expect(click).toHaveBeenCalledOnce()
    const a = click.mock.instances[0] as unknown as HTMLAnchorElement
    expect(a.download).toBe('a.ics'); expect(a.href).toBe('blob:x')
    expect(document.querySelector('a[download]')).toBeNull()
  })
})
