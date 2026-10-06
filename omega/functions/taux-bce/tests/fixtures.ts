// Flux réels de la BCE relevés le 6/10/2026 à 15 h Z (donnée publique) : le quotidien entier et le début
// du fichier 90 jours (deux jours de cotation), pour lire les deux formes (guillemets simples et doubles).

export const QUOTIDIEN_2026_10_06 = `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
	<gesmes:subject>Reference rates</gesmes:subject>
	<gesmes:Sender>
		<gesmes:name>European Central Bank</gesmes:name>
	</gesmes:Sender>
	<Cube>
		<Cube time='2026-10-06'>
			<Cube currency='USD' rate='1.1269'/>
			<Cube currency='JPY' rate='178.15'/>
			<Cube currency='CZK' rate='24.405'/>
			<Cube currency='DKK' rate='7.4747'/>
			<Cube currency='GBP' rate='0.84880'/>
			<Cube currency='HUF' rate='364.95'/>
			<Cube currency='PLN' rate='4.3650'/>
			<Cube currency='RON' rate='5.3510'/>
			<Cube currency='SEK' rate='11.2425'/>
			<Cube currency='CHF' rate='0.9359'/>
			<Cube currency='ISK' rate='137.20'/>
			<Cube currency='NOK' rate='10.7780'/>
			<Cube currency='TRY' rate='55.4196'/>
			<Cube currency='AUD' rate='1.6140'/>
			<Cube currency='BRL' rate='5.5991'/>
			<Cube currency='CAD' rate='1.6058'/>
			<Cube currency='CNY' rate='7.5554'/>
			<Cube currency='HKD' rate='8.8438'/>
			<Cube currency='IDR' rate='20104.80'/>
			<Cube currency='ILS' rate='3.4348'/>
			<Cube currency='INR' rate='108.6615'/>
			<Cube currency='KRW' rate='1508.67'/>
			<Cube currency='MXN' rate='20.2217'/>
			<Cube currency='MYR' rate='4.6034'/>
			<Cube currency='NZD' rate='2.0061'/>
			<Cube currency='PHP' rate='70.702'/>
			<Cube currency='SGD' rate='1.4392'/>
			<Cube currency='THB' rate='37.836'/>
			<Cube currency='ZAR' rate='18.5829'/>
		</Cube>
	</Cube>
</gesmes:Envelope>`;

export const HIST_DEUX_JOURS =
  `<?xml version="1.0" encoding="UTF-8"?><gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref"><gesmes:subject>Reference rates</gesmes:subject><gesmes:Sender><gesmes:name>European Central Bank</gesmes:name></gesmes:Sender><Cube><Cube time="2026-10-06"><Cube currency="USD" rate="1.1269"/><Cube currency="JPY" rate="178.15"/><Cube currency="CZK" rate="24.405"/><Cube currency="DKK" rate="7.4747"/><Cube currency="GBP" rate="0.8488"/><Cube currency="HUF" rate="364.95"/><Cube currency="PLN" rate="4.365"/><Cube currency="RON" rate="5.351"/><Cube currency="SEK" rate="11.2425"/><Cube currency="CHF" rate="0.9359"/><Cube currency="ISK" rate="137.2"/><Cube currency="NOK" rate="10.778"/><Cube currency="TRY" rate="55.4196"/><Cube currency="AUD" rate="1.614"/><Cube currency="BRL" rate="5.5991"/><Cube currency="CAD" rate="1.6058"/><Cube currency="CNY" rate="7.5554"/><Cube currency="HKD" rate="8.8438"/><Cube currency="IDR" rate="20104.8"/><Cube currency="ILS" rate="3.4348"/><Cube currency="INR" rate="108.6615"/><Cube currency="KRW" rate="1508.67"/><Cube currency="MXN" rate="20.2217"/><Cube currency="MYR" rate="4.6034"/><Cube currency="NZD" rate="2.0061"/><Cube currency="PHP" rate="70.702"/><Cube currency="SGD" rate="1.4392"/><Cube currency="THB" rate="37.836"/><Cube currency="ZAR" rate="18.5829"/></Cube>
<Cube time="2026-10-05"><Cube currency="USD" rate="1.1204"/><Cube currency="JPY" rate="177.28"/><Cube currency="CZK" rate="24.456"/><Cube currency="DKK" rate="7.4745"/><Cube currency="GBP" rate="0.8472"/><Cube currency="HUF" rate="367.8"/><Cube currency="PLN" rate="4.3795"/><Cube currency="RON" rate="5.3363"/><Cube currency="SEK" rate="11.2525"/><Cube currency="CHF" rate="0.9311"/><Cube currency="ISK" rate="137"/><Cube currency="NOK" rate="10.7575"/><Cube currency="TRY" rate="55.0755"/><Cube currency="AUD" rate="1.6097"/><Cube currency="BRL" rate="5.5849"/><Cube currency="CAD" rate="1.5969"/><Cube currency="CNY" rate="7.5118"/><Cube currency="HKD" rate="8.7925"/><Cube currency="IDR" rate="20069.89"/><Cube currency="ILS" rate="3.431"/><Cube currency="INR" rate="107.8915"/><Cube currency="KRW" rate="1505.8"/><Cube currency="MXN" rate="20.3348"/><Cube currency="MYR" rate="4.5791"/><Cube currency="NZD" rate="2.0038"/><Cube currency="PHP" rate="70.219"/><Cube currency="SGD" rate="1.4344"/><Cube currency="THB" rate="37.752"/><Cube currency="ZAR" rate="18.6263"/></Cube>
</Cube></gesmes:Envelope>`;
