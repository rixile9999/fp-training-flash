아래 모듈의 `initial` 함수가 잘못된 값을 돌려줍니다. `initial("Betty")`는 `"B."`여야 하는데 지금은 `"B"`가 나오고, 그 때문에 `initials`도 틀립니다. `initial`의 버그를 고치세요.

- `first_letter(name)`: 앞뒤 공백을 걷어낸 첫 글자를 대소문자 그대로 돌려준다. (이미 올바름)
- `initial(name)`: `first_letter`의 결과를 대문자로 바꾸고 뒤에 `.`을 붙인다.
- `initials(full_name)`: 공백 하나로 구분된 이름과 성의 `initial`을 공백 하나로 잇는다. (이미 올바름)

```gleam
initial("  james ")        // -> "J."
initials("Linda Miller")   // -> "L. M."
```
