import { describe, expect, it } from 'vitest';
import { buildTheme, sidebarColor, userBubbleColor } from './theme';

describe('theme', () => {
  it('builds a dark palette by default mode and a light palette when asked', () => {
    const dark = buildTheme('dark');
    const light = buildTheme('light');

    expect(dark.palette.mode).toBe('dark');
    expect(dark.palette.primary.main).toBe('#10a37f');
    expect(dark.palette.background.default).toBe('#212121');
    expect(light.palette.mode).toBe('light');
    expect(light.palette.background.paper).toBe('#ffffff');
    expect(light.palette.text.primary).toBe('#161616');
  });

  it('uses separate colors for the sidebar and the user bubble', () => {
    expect(sidebarColor('dark')).toBe('#171717');
    expect(sidebarColor('light')).toBe('#ffffff');
    expect(userBubbleColor('dark')).toBe('#303030');
    expect(userBubbleColor('light')).toBe('#ececec');
  });
});
