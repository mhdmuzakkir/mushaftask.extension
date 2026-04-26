import os, re
from collections import defaultdict

STANDARD_GLOBALS = {
    'console', 'document', 'window', 'Math', 'JSON', 'Date', 'parseInt', 'setTimeout', 'alert', 'confirm', 'prompt',
    'Object', 'Array', 'String', 'Number', 'Boolean', 'RegExp', 'Error', 'fs', 'path', 'os', 'require', 'setInterval',
    'clearTimeout', 'clearInterval', 'navigator', 'location', 'history', 'screen', 'localStorage', 'sessionStorage',
    'XMLHttpRequest', 'fetch', 'Promise', 'Set', 'Map', 'WeakMap', 'WeakSet', 'Symbol', 'Proxy', 'Reflect', 'Intl',
    'Buffer', 'process', 'module', 'exports', '__dirname', '__filename', 'global', 'undefined', 'null', 'true', 'false',
    'NaN', 'Infinity', 'arguments', 'this', 'super', 'eval'
}

files = []
files.append('js/main.js')
for f in os.listdir('js/modules'):
    if f.endswith('.js'):
        files.append(os.path.join('js/modules', f))

declarations = defaultdict(set)
usages = defaultdict(set)

def extract_declarations(content, filepath):
    for m in re.finditer(r'\b(var|let|const)\s+([A-Za-z_$][A-Za-z0-9_$]*)', content):
        name = m.group(2)
        declarations[name].add(filepath)
    for m in re.finditer(r'\bfunction\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(', content):
        name = m.group(1)
        declarations[name].add(filepath)

def extract_usages(content, filepath):
    temp = content
    temp = re.sub(r'//.*', '', temp)
    temp = re.sub(r'/\*.*?\*/', '', temp, flags=re.DOTALL)
    temp = re.sub(r'"(?:[^"\\]|\\.)*"', '""', temp)
    temp = re.sub(r"'(?:[^'\\]|\\.)*'", "''", temp)
    temp = re.sub(r'`(?:[^`\\]|\\.)*`', '``', temp)
    
    for m in re.finditer(r'\b([A-Za-z_$][A-Za-z0-9_$]*)\b', temp):
        name = m.group(1)
        if name in ('var', 'let', 'const', 'function', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break',
                    'continue', 'return', 'try', 'catch', 'finally', 'throw', 'new', 'delete', 'typeof', 'instanceof',
                    'in', 'of', 'void', 'with', 'class', 'extends', 'import', 'export', 'default', 'from', 'as',
                    'async', 'await', 'yield', 'debugger', 'static', 'get', 'set'):
            continue
        pos = m.start()
        if pos > 0:
            prev_char = temp[pos-1]
            if prev_char == '.':
                continue
        after = temp[m.end():m.end()+20]
        if re.match(r'\s*:', after):
            before = temp[max(0,pos-20):pos]
            if re.search(r'[{,]\s*$', before):
                continue
        usages[name].add(filepath)

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    extract_declarations(content, filepath)
    extract_usages(content, filepath)

ALL_GLOBALS = STANDARD_GLOBALS | set(declarations.keys())

undeclared = {}
for name, files_used in usages.items():
    if name not in ALL_GLOBALS:
        undeclared[name] = files_used

print('=== VARIABLES USED BUT NEVER DECLARED ===')
for name in sorted(undeclared.keys()):
    files_list = sorted(undeclared[name])
    print(f'{name}: {files_list}')

print(f'\nTotal undeclared variables found: {len(undeclared)}')

print('\n=== KEY GLOBAL DECLARATION CHECK ===')
for name in ['state', 'authState', 'QUOTES', 'USER_ASSIGNMENTS', 'fs', 'path', 'os', 'CSInterface']:
    if name in declarations:
        print(f'{name}: DECLARED in {declarations[name]}')
    else:
        print(f'{name}: NOT DECLARED')
