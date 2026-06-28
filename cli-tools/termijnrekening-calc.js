#!/usr/bin/env node
const amounts = [10000, 8500, 5000];
const jaren = 2;
const roerende_voorheffing = 0.30;

const bruto = parseFloat(process.argv[2]) || 3.00;
const netto = bruto * (1 - roerende_voorheffing);

console.log(`\n📈 Termijnrekening calculator (${jaren} jaar, RV ${(roerende_voorheffing*100)}%)`);
console.log(`   Bruto: ${bruto.toFixed(2)}% → Netto: ${netto.toFixed(2)}%\n`);
console.log('Bedrag'.padEnd(12), `| Bruto/${jaren}j`.padEnd(14), `| Netto/${jaren}j`.padEnd(14), `| Per maand`);
console.log('-'.repeat(58));

for (const b of amounts) {
  const brutoOpbrengst = b * (bruto / 100) * jaren;
  const nettoOpbrengst = b * (netto / 100) * jaren;
  const perMaand = nettoOpbrengst / (jaren * 12);
  console.log(
    `€${b.toLocaleString('nl-BE')}`.padEnd(12),
    `€${brutoOpbrengst.toFixed(2)}`.padEnd(14),
    `€${nettoOpbrengst.toFixed(2)}`.padEnd(14),
    `€${perMaand.toFixed(2)}/mnd`
  );
}
console.log();
