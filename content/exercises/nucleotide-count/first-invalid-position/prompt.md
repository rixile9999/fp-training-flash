DNA 염기 서열을 받아 네 염기 `A`, `C`, `G`, `T`의 개수를 세되, 잘못된 글자가 있으면 **무엇이 어디서** 잘못되었는지 알려 주세요.

```gleam
pub type CountError {
  InvalidNucleotide(letter: String, index: Int)
}
```

- 모든 글자가 대문자 `A`, `C`, `G`, `T`이면 `Ok(counts)`를 반환한다. `counts`에는 네 키가 항상 들어 있다(없는 염기는 0).
- 그 밖의 글자(소문자 포함)가 있으면 `Error(InvalidNucleotide(letter, index))`를 반환한다. `index`는 0부터 센 위치다.
- 잘못된 글자가 여러 개면 **가장 앞에 있는 것**을 알린다.

```gleam
nucleotide_count("GATXACZ")
// -> Error(InvalidNucleotide("X", 3))
```
