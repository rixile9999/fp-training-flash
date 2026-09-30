//// Grader-internal entry point. Learner code must never import `fp_internal/*` (static checks reject it).
//// The real work happens in `fp_internal_harness_ffi.erl`; the runner starts it with
//// `erl -eval 'fp_internal@harness:main()'` after `gleam build`.

@external(erlang, "fp_internal_harness_ffi", "main")
fn run() -> Nil

pub fn main() -> Nil {
  run()
}
