설정 파일의 한 줄 `"키=값"`을 읽는 `parse_setting`은 반환 타입이 `Result`인데도, 잘못된 줄을 만나면 `let assert`에서 프로세스가 죽습니다. 설정 파일에 오타가 하나만 있어도 서버가 시작되지 않습니다.

`let assert`를 없애고, 잘못된 입력을 `SettingError` 값으로 반환하도록 고치세요.

```gleam
pub type SettingError {
  MissingEquals(line: String)
  NotANumber(value: String)
}
```

- `=`가 없으면 `Error(MissingEquals(줄 전체))`.
- 첫 번째 `=`를 기준으로 키와 값을 나눈다. 값이 정수가 아니면 `Error(NotANumber(값))`. 빈 값도 정수가 아니다.
- 공백은 제거하지 않는다. 올바른 줄의 결과는 지금과 같다.
- `let assert`와 `panic`을 쓰지 않는다.

```gleam
parse_setting("retries=3")      // -> Ok(Setting("retries", 3))
parse_setting("retries=three")  // 지금: 크래시   고친 뒤: Error(NotANumber("three"))
```
