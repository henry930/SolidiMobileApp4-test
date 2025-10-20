// Debug script to test HTML rendering
const React = require('react');

const testHtml = '<h2>Which type of investor are you?</h2>';
const testHtml2 = '<h5>The UK Financial Conduct Authority (FCA) requires that we ask you some additional questions to better understand your financial circumstances and serve you.<br><br>The FCA prescribes three investor categories.</h5>';
const testHtml3 = '<b>Restricted investor</b><br>You\'ve invested less than 10% of your net worth in high risk assets (such as Crypto) over the last 12 months, <b>and</b> you intend to limit such investments to less than 10% in the year ahead.<br>&nbsp;';

console.log('Testing HTML content:');
console.log('1. H2 tag:', testHtml);
console.log('2. H5 tag with BR:', testHtml2);
console.log('3. Bold with BR and &nbsp;:', testHtml3);

// Test if strings contain HTML tags
console.log('\nHTML detection tests:');
console.log('H2 contains <:', testHtml.includes('<'));
console.log('H5 contains <:', testHtml2.includes('<'));
console.log('Bold contains <:', testHtml3.includes('<'));

// Test regex replacement (fallback)
console.log('\nFallback plain text versions:');
console.log('H2 plain:', testHtml.replace(/<[^>]*>/g, ''));
console.log('H5 plain:', testHtml2.replace(/<[^>]*>/g, ''));
console.log('Bold plain:', testHtml3.replace(/<[^>]*>/g, ''));