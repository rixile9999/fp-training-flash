실험실에서 `Error(Nil)`만으로는 긴 DNA 서열의 어디가 잘못되었는지 찾기 어렵다는 요청이 들어왔습니다. 오류에 위치와 글자를 담도록 `to_rna`를 다시 구현하세요.

```gleam
pub type TranscriptionError {
  InvalidNucleotide(position: Int, found: String)
}

pub fn to_rna(dna: String) -> Result(String, TranscriptionError)
```

- 변환 규칙은 같다: `G`→`C`, `C`→`G`, `T`→`A`, `A`→`U`. 결과는 입력 순서대로 이어 붙여 `Ok`로 감싼다. 빈 문자열은 `Ok("")`이다.
- 네 대문자가 아닌 글자가 있으면 `Error(InvalidNucleotide(position, found))`를 반환한다.
  - `position`은 그 글자의 위치로, **0부터** 센다.
  - `found`는 그 글자 자체다.
  - 잘못된 글자가 여러 개면 가장 앞(위치가 가장 작은) 글자를 보고한다.

```gleam
to_rna("ACGT")   // -> Ok("UGCA")
to_rna("ACXT")   // -> Error(InvalidNucleotide(position: 2, found: "X"))
```
