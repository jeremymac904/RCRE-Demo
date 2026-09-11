import re, html, sys
def text(path, start_marker=None):
    h=open(path,encoding='utf-8',errors='replace').read()
    b=h[h.find('<body'):]
    b=re.sub(r'<script.*?</script>','',b,flags=re.S)
    b=re.sub(r'<style.*?</style>','',b,flags=re.S)
    b=re.sub(r'<!--.*?-->','',b,flags=re.S)
    b=re.sub(r'<(h1|h2|h3|h4|h5|h6)\b[^>]*>', r'\n[\1] ', b)
    b=re.sub(r'<br\s*/?>','\n',b)
    b=re.sub(r'</(p|div|li|section|h1|h2|h3|h4|h5|h6|a|span|td|tr)>','\n',b)
    b=re.sub(r'<[^>]+>',' ',b)
    b=html.unescape(b)
    lines=[re.sub(r'[ \t]+',' ',l).strip() for l in b.split('\n')]
    out=[];prev=None
    for l in lines:
        if not l or l==prev: continue
        prev=l; out.append(l)
    return '\n'.join(out)
if __name__=='__main__':
    print(text(sys.argv[1]))
