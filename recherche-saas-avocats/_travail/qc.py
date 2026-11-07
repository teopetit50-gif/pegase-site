import subprocess, re, html, json
def fetch(u):
    h=subprocess.run(["curl","-sS","-L","--max-time","40",u],capture_output=True,text=True,errors="ignore").stdout
    h=re.sub(r"(?is)<(script|style|noscript).*?</\1>"," ",h); t=re.sub(r"(?s)<[^>]+>"," ",h); return re.sub(r"\s+"," ",html.unescape(t))
checks=[
("ABA : 1 374 720 avocats actifs 2025","https://www.2civility.org/us-lawyer-population-grows-for-first-time-since-2020/",[r"1,374,720"]),
("CaseFleet : 30 et 140 USD/utilisateur/mois","https://www.casefleet.com/pricing",[r"\$30",r"\$140"]),
("MyCase : 50/100/130 USD annuel, Accounting 39","https://www.mycase.com/pricing/",[r"\$50",r"\$100",r"\$130",r"\$39"]),
("Smith.ai : 300 USD / 30 appels","https://smith.ai/pricing",[r"\$300",r"30 calls"]),
("Docket Alarm : 99 USD flat, 39,99 PAYG","https://www.docketalarm.com/pricing",[r"\$99",r"\$39\.99"]),
("LawPay : 19 USD/mois, 2,99 %","https://www.lawpay.com/pricing/",[r"\$19",r"2\.99%"]),
("Xakia : 100/125/155/230 USD","https://www.xakia.com/pricing",[r"\$100",r"\$125",r"\$155",r"\$230"]),
("Family Law Software : 39,95 et 79,95","https://www.familylawsoftware.com/pricing",[r"39\.95",r"79\.95"]),
("GoldFynch : 3 Go 27 USD, 10 Go 76 USD","https://goldfynch.com/pricing",[r"\$27",r"\$76"]),
("Digital WarRoom : 500 USD/mois minimum, 2 000 USD cloud privé","https://www.digitalwarroom.com/pricing",[r"\$500",r"\$2,000"]),
("Intapp FY2025 : 504,1 M USD, ARR 485,4","https://www.businesswire.com/news/home/20250812249063/en",[r"504\.1",r"485\.4"]),
("DISCO 2025 : Q4 41,2 M, guidance 167-177","https://www.businesswire.com/news/home/20260224533812/en",[r"41\.2",r"167"]),
("Supio série B 60 M USD (30 avril 2025)","https://www.lawnext.com/2025/05/legal-tech-startup-supio-secures-60-million-in-series-b-funding-to-expand-ai-platform-for-personal-injury-law.html",[r"\$60 million",r"Sapphire"]),
("EvenUp série E 150 M USD à 2 Md","https://www.businesswire.com/news/home/20251007138957/en/",[r"150M",r"2B"]),
("Eve série B 103 M USD","https://www.lawnext.com/2025/09/eve-ai-driven-platform-for-plaintiff-side-law-firms-raises-103-million-in-series-b-round.html",[r"\$103 million"]),
("Legora série D 550 M USD à 5,55 Md","https://legora.com/newsroom/legora-raises-550-million-series-d-to-fuel-us-growth",[r"550",r"5\.55"]),
("Laurel série C 100 M USD","https://www.lawnext.com/2025/06/ai-timekeeping-platform-laurel-raises-100m-in-series-c-round.html",[r"\$100",r"IVP"]),
("Relativity aiR for Case Strategy : chronologie, 650 faits -> 50","https://www.lawnext.com/2026/01/relativity-launches-air-for-case-strategy-to-extract-and-organize-key-facts-using-generative-ai.html",[r"chronolog",r"650"]),
("LawToolBox : 35 et 42 USD","https://lawtoolbox.com/pricing/",[r"\$35",r"\$42"]),
("Clio vLex 1 Md, série G 500 M à 5 Md","https://legaltechnology.com/2025/11/10/clio-completes-1bn-acquisition-of-vlex-raises-500m-series-g-at-5bn-valuation/",[r"1bn",r"500m",r"5bn"]),
("Brightflag racheté 425 M EUR","https://sacra.com/c/brightflag/",[r"425"]),
("AffiniPay 2025 : 31 %, 21 %, 43 %","https://www.lawnext.com/2025/03/affinipays-2025-legal-industry-report-portrays-a-profession-at-a-technological-crossroads.html",[r"31%",r"21%",r"43%"]),
("Rule 1.1 : 40 États","https://www.lawnext.com/tech-competence",[r"40 States|40 states"]),
("CASEpeer : 90/130/160","https://www.casepeer.com/pricing",[r"\$90",r"\$130",r"\$160"]),
("Docketwise : 80/100/120","https://www.docketwise.com/pricing",[r"\$80",r"\$100",r"\$120"]),
]
res=[]
for name,url,pats in checks:
    t=fetch(url); ok=[bool(re.search(p,t)) for p in pats]
    status="OK" if all(ok) else ("PARTIEL" if any(ok) else ("INACCESSIBLE" if len(t)<500 else "NON TROUVÉ"))
    res.append((name,url,status,ok,len(t)))
    print(f"{status:12s} | {name} | {ok} | {len(t)} car. | {url}")
json.dump(res,open("qc_results.json","w"),ensure_ascii=False)
