동료가 작성한 `exciting_list`에 버그가 있습니다. 규칙에 맞게 고치세요.

`exciting_list(languages)`는 다음 중 하나이면 `True`, 아니면 `False`를 반환해야 합니다.

- 첫 번째 언어가 `"Gleam"`이다. (목록 길이는 상관없다)
- 두 번째 언어가 `"Gleam"`이고, 목록 길이가 2 또는 3이다.

빈 목록은 `False`입니다. 지금 코드는 적어도 두 가지 경우에서 틀린 값을 돌려줍니다.

```gleam
exciting_list(["Gleam"])
// 기대: True
exciting_list(["Elm", "Gleam", "C#", "Scheme"])
// 기대: False
```
