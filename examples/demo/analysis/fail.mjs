// Fails part way: prints some progress, then an error, and exits with code 3.
console.log('Loading data/2027.csv…');
console.error('Error: data/2027.csv not found. Signups for 2027 have not been exported yet.');
process.exit(3);
