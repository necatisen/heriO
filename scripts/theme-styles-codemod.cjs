// One-off: makes hard-coded brand colors follow the active theme.
//  - JSX  color="#5B4BFF"           → color={theme.primary}
//  - const styles = StyleSheet.create({...'#5B4BFF'...})
//        → const createStyles = (t: Theme) => StyleSheet.create({... t.primary ...})
//          + const styles = useMemo(() => createStyles(theme), [theme]); in the default component
const fs = require('fs');
const files = process.argv.slice(2);
const MAP = { '#5B4BFF': 't.primary', '#8B3DFF': 't.primary', '#FF6B9D': 't.primary', '#1D9BF0': 't.primary' };
for (const f of files) {
  let s = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
  s = s.replace(/color="(#5B4BFF|#8B3DFF)"/g, 'color={theme.primary}');
  const start = s.indexOf('const styles = StyleSheet.create({');
  let changed = 0;
  if (start >= 0) {
    // find end of the StyleSheet.create call
    let depth = 0, i = s.indexOf('{', start), end = -1;
    for (; i < s.length; i++) {
      if (s[i] === '{') depth++;
      else if (s[i] === '}' && --depth === 0) { end = s.indexOf(');', i) + 2; break; }
    }
    let block = s.slice(start, end);
    const keepVerified = f.includes('explore') ? false : true; // explore: #1D9BF0 is the chat button
    block = block.replace(/'(#5B4BFF|#8B3DFF|#FF6B9D|#1D9BF0)'/g, (m, hex) => {
      if (hex === '#1D9BF0' && keepVerified) return m;
      changed++;
      return MAP[hex];
    });
    if (changed) {
      block = block.replace('const styles = StyleSheet.create({', 'const createStyles = (t: Theme) =>\n  StyleSheet.create({');
      s = s.slice(0, start) + block + s.slice(end);
      // inject memoized styles right after the theme hook of the default component
      const def = s.search(/export default function \w+/);
      const hookRe = /const \{[^}]*\btheme\b[^}]*\} = useTheme\(\);\n/g;
      hookRe.lastIndex = def;
      const m = hookRe.exec(s);
      if (!m) throw new Error(`${f}: no theme hook in default component`);
      const at = m.index + m[0].length;
      s = s.slice(0, at) + '  const styles = useMemo(() => createStyles(theme), [theme]);\n' + s.slice(at);
      if (!/\buseMemo\b[^;]*from 'react'/.test(s)) {
        if (/import \{([^}]*)\} from 'react';/.test(s)) s = s.replace(/import \{([^}]*)\} from 'react';/, (mm, names) => `import {${names.trimEnd()}, useMemo } from 'react';`);
        else s = "import { useMemo } from 'react';\n" + s;
      }
      if (!/\btype Theme\b|\bTheme\b[^;]*from '@\/contexts\/ThemeContext'/.test(s)) {
        s = s.replace(/import \{([^}]*)\buseTheme\b([^}]*)\} from '@\/contexts\/ThemeContext';/, "import {$1useTheme$2, type Theme } from '@/contexts/ThemeContext';");
      }
    }
  }
  fs.writeFileSync(f, s);
  console.log(`${f}: styles→theme ${changed}, left: ${(s.match(/#5B4BFF|#8B3DFF|#FF6B9D/g) || []).length}`);
}
