
const { clsx } = require('clsx');
const { twMerge } = require('tailwind-merge');

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

console.log('Result 1:', cn("overflow-hidden", true && "overflow-visible"));
console.log('Result 2:', cn("overflow-hidden", false && "overflow-visible"));
console.log('Result 3:', cn("overflow-hidden", "relative", true && "overflow-visible"));
