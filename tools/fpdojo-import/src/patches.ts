/**
 * Post-import corrections from the gleam 1.18.1 / Erlang re-verification (2026-10-01).
 * Applied to content/lessons after the converter; idempotent.
 *   node tools/fpdojo-import/src/patches.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "yaml";

const root = resolve(fileURLToPath(new URL("../../..", import.meta.url)), "content/lessons");
type Obj = Record<string, any>;

function edit(unit: string, lesson: string, fn: (ko: Obj, en: Obj) => void) {
  const koPath = join(root, unit, `${lesson}.yaml`);
  const enPath = join(root, unit, `${lesson}.en.yaml`);
  const ko = parse(readFileSync(koPath, "utf8"));
  const en = parse(readFileSync(enPath, "utf8"));
  fn(ko, en);
  writeFileSync(koPath, stringify(ko, { lineWidth: 0 }));
  writeFileSync(enPath, stringify(en, { lineWidth: 0 }));
}
const block = (ko: Obj, id: string): Obj => ko.blocks.find((b: Obj) => (b.exercise ?? b.prose) === id);

// 1. bind-syntax: `const x = 5` is valid at module level; scope the question to function bodies.
edit("u01-values", "l01-values-let", (ko, en) => {
  block(ko, "bind-syntax").prompt = "함수 본문 안에서 값을 이름에 묶는 올바른 문법은 무엇일까요?";
  en.blocks["bind-syntax"].prompt = "Inside a function body, what is the correct syntax for binding a value to a name?";
});

// 2. mixed-arith: duplicated clause in the correct feedback.
edit("u01-values", "l03-int-float", (ko, en) => {
  const b = block(ko, "mixed-arith");
  if (b) b.feedback.correct = "맞아요! `Int`와 `Float`는 섞을 수 없어요. 컴파일러가 타입 불일치(Type mismatch) 에러로 막습니다.";
  const e = en.blocks["mixed-arith"];
  if (e) e.feedback.correct = "Correct! `Int` and `Float` cannot be mixed. The compiler stops it with a Type mismatch error.";
});

// 3. redundant-bool-spot: choice 2 was the same anti-pattern as the answer.
edit("u03-case-branching", "l07-no-early-return", (ko, en) => {
  const b = block(ko, "redundant-bool-spot");
  b.choices[2] = "0 < n";
  b.feedback.choices["2"] = "`0 < n`은 `n > 0`을 뒤집어 쓴 것일 뿐이에요. 이미 Bool이고 간결합니다.";
  const e = en.blocks["redundant-bool-spot"];
  e.choices[2] = "0 < n";
  e.feedback.choices["2"] = "`0 < n` is just `n > 0` written the other way round. It is already a Bool and concise.";
});

// 4. same-arg-infinite: feedback described the browser watchdog.
edit("u05-lists-recursion", "l05-termination", (ko, en) => {
  block(ko, "same-arg-infinite").feedback.correct =
    "맞아요! `xs`는 줄어들지 않아 종료 조건(`[]`)에 영영 닿지 못합니다. 실행하면 끝나지 않아 시간 제한에 걸려요. `rest`를 넘겨 문제를 작게 만드세요.";
  en.blocks["same-arg-infinite"].feedback.correct =
    "Correct! `xs` never shrinks, so it can never reach the base case (`[]`). Running it never finishes and hits the time limit. Pass `rest` to make the problem smaller.";
});

// 5. stack growth prose: on the BEAM deep body recursion grows memory instead of overflowing.
edit("u06-tail-recursion", "l15-stack-growth", (ko, en) => {
  for (const b of ko.blocks) {
    if (typeof b.markdown === "string")
      b.markdown = b.markdown.replace(
        "리스트가 길어지면 프레임도 그만큼 깊이 쌓여, 아주 긴 입력에서는 스택이 넘칠 수 있습니다.",
        "리스트가 길어지면 프레임도 그만큼 깊이 쌓입니다. JavaScript 타깃에서는 아주 긴 입력에서 스택이 넘칠 수 있고, Erlang(BEAM)에서는 넘치지 않는 대신 입력 길이에 비례해 메모리를 씁니다.",
      );
  }
  for (const v of Object.values(en.blocks) as Obj[]) {
    if (typeof v.markdown === "string")
      v.markdown = v.markdown.replace(
        "As the list grows longer, the frames pile up just as deep, and with a very long input the stack can overflow.",
        "As the list grows longer, the frames pile up just as deep. On the JavaScript target a very long input can overflow the stack; on Erlang (the BEAM) it does not overflow but uses memory in proportion to the input length.",
      );
  }
});

// 6. map-box-*: Erlang's string.inspect prints records without labels.
edit("u11-generics", "l41-generic-types", (ko, en) => {
  const a = block(ko, "map-box-incr");
  a.choices = ["`Box(6)`", "`6`", "`Box(5)`", "`Box(5, 6)`"];
  a.feedback.correct = "맞아요! `f`가 안의 5를 6으로 바꾸고, 결과는 **다시 상자에 담겨** `Box(6)`.";
  a.feedback.choices["1"] = "`map_box`는 상자째 돌려줍니다. 벗긴 값(`6`)이 아니라 `Box(6)`이에요. (벗기려면 `unbox`)";
  const ea = en.blocks["map-box-incr"];
  ea.choices = ["`Box(6)`", "`6`", "`Box(5)`", "`Box(5, 6)`"];
  ea.feedback.correct = ea.feedback.correct.replaceAll("Box(inner: 6)", "Box(6)");
  ea.feedback.choices["1"] = ea.feedback.choices["1"].replaceAll("Box(inner: 6)", "Box(6)");
  const b = block(ko, "map-box-upper");
  b.choices = ['`Box("GLEAM")`', '`"GLEAM"`', '`Box("gleam")`', "컴파일 에러"];
  b.feedback.choices["1"] = '결과는 상자입니다. 벗긴 문자열이 아니라 `Box("GLEAM")`이에요.';
  const eb = en.blocks["map-box-upper"];
  eb.choices = eb.choices.map((c: string) => c.replaceAll("inner: ", ""));
  eb.feedback.choices["1"] = eb.feedback.choices["1"].replaceAll("inner: ", "");
});

// 7. thunk-defers: "nothing is printed" was also true; ask for the value and the output.
edit("u14-gleam-omits", "l14-eager", (ko, en) => {
  const b = block(ko, "thunk-defers");
  b.prompt = "이번엔 `expensive`를 `fn() { ... }`로 감싸 `lazy_guard`에 넘깁니다. `when: False`일 때 이 식의 값과 출력은?";
  b.choices[0] = "값은 `\"기본\"`, 출력은 없음 (expensive 썽크는 호출 안 됨)";
  b.choices[3] = "값은 `\"결과\"` (return 썽크가 호출됨)";
  b.feedback.choices["3"] = "`when: False`이면 `otherwise` 썽크가 골라집니다. `return` 쪽은 호출되지 않으니 값은 `\"기본\"`이에요.";
  const e = en.blocks["thunk-defers"];
  e.prompt = "Now `expensive` is wrapped in `fn() { ... }` and passed to `lazy_guard`. With `when: False`, what is the value of this expression, and what is printed?";
  e.choices[0] = 'The value is `"default"` and nothing is printed (the expensive thunk is never called)';
  e.choices[3] = 'The value is `"result"` (the return thunk is called)';
  e.feedback.choices["3"] = 'With `when: False` the `otherwise` thunk is chosen. The `return` side is never called, so the value is `"default"`.';
});

// 8. OTP lesson: premise assumed the old in-browser platform.
edit("u15-capstone", "l15-otp-actor", (ko, en) => {
  for (const b of ko.blocks) {
    if (typeof b.markdown === "string")
      b.markdown = b.markdown.replace(
        "⚠️ **이 레슨의 코드는 실행되지 않습니다.** gleam_otp의 actor는 Erlang VM 전용이라 브라우저(JS 타깃)에서 돌릴 수 없어요.",
        "⚠️ **이 레슨의 코드는 읽기만 합니다.** gleam_otp의 actor는 Erlang VM 전용이고, 이 플랫폼의 실습 환경에는 gleam_otp가 들어 있지 않아요. 브라우저(JS 타깃)에서도 돌릴 수 없습니다.",
      );
  }
  const q = block(ko, "actor-why-no-run");
  q.prompt = "이 actor 코드를 JavaScript 타깃(브라우저)으로 컴파일하면 왜 거부될까요?";
  q.feedback.choices["3"] = "Gleam은 JS 타깃으로 브라우저에서도 잘 돕니다. 단지 OTP만 Erlang 전용입니다.";
  for (const v of Object.values(en.blocks) as Obj[]) {
    if (typeof v.markdown === "string")
      v.markdown = v.markdown.replace(
        "⚠️ **The code in this lesson does not run.** gleam_otp's actor is Erlang VM-only, so it can't run in the browser (the JS target).",
        "⚠️ **The code in this lesson is for reading only.** gleam_otp's actor is Erlang VM-only, and this platform's practice environment does not include gleam_otp. It can't run in the browser (the JS target) either.",
      );
  }
  const e = en.blocks["actor-why-no-run"];
  e.prompt = "Why is this actor code rejected when compiled to the JavaScript target (browser)?";
  e.feedback.choices["3"] = "Gleam runs fine in the browser via the JS target. It's just OTP that's Erlang-only.";
});

console.log("patches applied");
