"""Découpe un CSS minifié en blocs de premier niveau (accolades équilibrées)."""
def blocs(css):
    out=[]; i=0; n=len(css)
    while i<n:
        while i<n and css[i] in ' \n\t\r': i+=1
        if i>=n: break
        if css.startswith('/*',i):
            j=css.find('*/',i)+2; i=j; continue
        j=i; prof=0; chaine=None
        while j<n:
            c=css[j]
            if chaine:
                if c=='\\': j+=2; continue
                if c==chaine: chaine=None
            elif c in '"\'': chaine=c
            elif c=='{': prof+=1
            elif c=='}':
                prof-=1
                if prof==0: j+=1; break
            elif c==';' and prof==0: j+=1; break
            j+=1
        out.append(css[i:j]); i=j
    return out
def tete(b):
    k=b.find('{'); return b[:k].strip() if k>=0 else b.strip()
def corps(b):
    k=b.find('{'); return b[k+1:b.rfind('}')] if k>=0 else ''
