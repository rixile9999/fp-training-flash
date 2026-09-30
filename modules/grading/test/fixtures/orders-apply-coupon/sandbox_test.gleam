//// Runner-level sandbox probes (test files may use FFI; learner code may not).
//// Every test passes only when the sandbox does NOT stop the escape attempt.

@external(erlang, "sandbox_ffi", "read_passwd")
fn read_passwd() -> Result(Int, String)

@external(erlang, "sandbox_ffi", "connect")
fn connect() -> Result(Nil, String)

@external(erlang, "sandbox_ffi", "write_outside")
fn write_outside() -> Result(Nil, String)

@external(erlang, "sandbox_ffi", "uid")
fn uid() -> String

pub fn read_passwd_test() {
  let assert Ok(_) = read_passwd()
}

pub fn network_test() {
  let assert Ok(_) = connect()
}

pub fn write_outside_test() {
  let assert Ok(_) = write_outside()
}

pub fn root_user_test() {
  assert uid() == "0"
}
