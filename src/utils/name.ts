// CVC pattern
// 0 Bab, 1 Cab, ..., 19 Yab, 20 Zab
// 21 Beb, ..., 41 Zeb
// ...
// 84 Bub, ..., 104 Zub
// 105 Bac, ..., 125 Zac
// ...
// 189 Buc, ..., 209 Zuc
// ...
// 2100 Baz, ..., 2120 Zaz
// ...
// 2184 Buz, ..., 2204 Zuz
// 2205 Bab, starting over
export function intToName(num: number): string {
    const consonants = 'bcdfghjklmnpqrstvwxyz';
    const vowels = 'aeiou';

    const c = consonants.length; // 21
    const v = vowels.length;     // 5

    const firstIdx = num % c;
    const vowelIdx = Math.floor(num / c) % v;
    const lastIdx = Math.floor(num / (c * v)) % c;

    const name = consonants[firstIdx].toUpperCase() + vowels[vowelIdx] + consonants[lastIdx];
    return name;
}
