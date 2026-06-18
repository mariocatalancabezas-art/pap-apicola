import XLSX from 'xlsx';
const wb = XLSX.readFile('public/Planillas/Lista Usuarios PAP ASB y ABB.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
console.log('=== HEADERS ===');
console.log(data[0]);
console.log('\n=== PRIMERAS 3 FILAS ===');
console.log(data.slice(1, 4));
console.log('\n=== TOTAL FILAS ===', data.length);
