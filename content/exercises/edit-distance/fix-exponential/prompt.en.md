The product registration screen computes the edit distance between a new product name and existing ones to warn about duplicate listings. The `distance` below gives correct answers for short names, but never finishes when it compares long product descriptions. Fix it so that it gives the same answers as now and finishes within the time limit.

- An edit is inserting, deleting or substituting one character, and each counts as 1. Characters are counted as graphemes.
- It must finish within the time limit even for two 250-character names.

```gleam
distance(from: "usb-c cable 1m", to: "usb-c cable 2m")  // -> 1 (already correct)
distance(from: <250 chars>, to: <250 chars>)            // now: never finishes
```
