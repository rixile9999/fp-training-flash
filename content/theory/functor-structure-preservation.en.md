---
id: functor-structure-preservation
title: 'Structure-preserving transformations: functors'
---
`map` leaves the **shape** of a container alone and changes only the values inside. For a list, the shape is its length and order. A structure with this property is called a functor, and the property is stated as two laws.

```gleam
// Identity law: mapping with a function that does nothing gives back the original value
list.map(xs, fn(x) { x }) == xs

// Composition law: mapping twice is the same as mapping once with the composed function
list.map(list.map(xs, g), f) == list.map(xs, fn(x) { f(g(x)) })
```

The first law means `map` doesn't add, remove or reorder items. Thanks to the second law, you can merge consecutive `map` steps in a pipeline into one, or split one apart, without changing the meaning.

`filter`, by contrast, is an operation that changes the shape. The result can have a different length from the input, so the functor laws don't hold.

## Where this concept is used

- When a requirement says "keep the length and order", you need a structure-preserving transformation.
- `map` for `Option` and `Result` follows the same laws: if there is a value it changes it, and if there is none or it's an error it leaves it as is.
