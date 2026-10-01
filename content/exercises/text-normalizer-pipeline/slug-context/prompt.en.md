You want to build a slug for the address of a product detail page from the product name. Write the small functions in order, and have each later function reuse the earlier ones.

1. `clean_word(word: String) -> String`
   - Convert to lowercase, then keep only the lowercase letters `a`–`z` and the digits `0`–`9`. (Hangul, symbols, spaces and everything else are removed)
2. `to_words(text: String) -> List(String)`
   - Apply `clean_word` to each piece you get by splitting on the space character (`" "`), and drop words whose cleaned result is the empty string. Keep the order.
3. `slugify(text: String) -> String`
   - Join the words from `to_words` with `-`.
4. `short_slug(text: String, max_words: Int) -> String`
   - Join at most `max_words` words from the front of the `to_words` result with `-`. If there are fewer words than that, use them all. If `max_words` is 0 or less, `""`.

```gleam
to_words("Fresh Apples (5kg) - SALE!")       // -> ["fresh", "apples", "5kg", "sale"]
slugify("Fresh Apples (5kg) - SALE!")        // -> "fresh-apples-5kg-sale"
short_slug("Fresh Apples (5kg) - SALE!", 2)  // -> "fresh-apples"
```
