;; Minimal cross-contract probe (seal0 ABI, raw wat — no ink!).
;;
;; Verified against Portaldot's frame/contracts/src/wasm/runtime.rs (Substrate
;; 3.0.0). seal_call host fn signature:
;;   callee_ptr / callee_len -> SCALE-decoded as AccountId (raw 32-byte
;;                              AccountId32; NOT a MultiAddress)
;;   value_ptr  / value_len  -> SCALE-decoded as BalanceOf<T> = u128 (16 bytes)
;;   input_data_ptr / _len   -> raw bytes
;;
;; Input on `call` (34 bytes):
;;   [0..32]  callee account id (raw pubkey)
;;   [32]     byte forwarded as callee input
;;   [33]     expected ReturnCode (0=Success, 1=CalleeTrapped, 2=CalleeReverted)
;;
;; Behaviour: invokes the callee with the forwarded byte, then traps if the
;; observed ReturnCode doesn't match the expected one. On match the function
;; falls through (no seal_return — pallet-contracts SCALE-decodes seal_return
;; payload at the extrinsic boundary, so empty fall-through is the safe
;; success path).

(module
  (import "seal0" "seal_input" (func $seal_input (param i32 i32)))
  (import "seal0" "seal_call"  (func $seal_call
      (param i32 i32 i64 i32 i32 i32 i32 i32 i32) (result i32)))
  (import "env" "memory" (memory 1 1))

  ;; Memory layout:
  ;;     0.. 16    value buffer (16 zero bytes -> u128 value = 0)
  ;;    16.. 20    input length sentinel (write 64)
  ;;    24.. 58    input scratch: [callee_addr 32 | callee_in 1 | expected 1]
  ;;    64.. 96    call output buffer (up to 32 bytes; discarded)
  ;;   100..104    output length sentinel (write 32)

  (func (export "deploy"))

  (func (export "call")
    (local $rc i32)

    (i32.store (i32.const 16) (i32.const 64))
    (call $seal_input (i32.const 24) (i32.const 16))

    (i32.store (i32.const 100) (i32.const 32))
    (local.set $rc
      (call $seal_call
        (i32.const 24) (i32.const 32)     ;; callee_ptr / callee_len (raw AccountId32)
        (i64.const 0)                     ;; gas = 0 -> all available
        (i32.const 0)  (i32.const 16)     ;; value_ptr / value_len (u128 = 0)
        (i32.const 56) (i32.const 1)      ;; input_data_ptr / input_data_len
        (i32.const 64) (i32.const 100)    ;; output_ptr / output_len_ptr
      )
    )

    ;; Assert observed == expected (input byte at offset 57). On match fall
    ;; through; on mismatch trap with `unreachable`.
    (block $ok
      (br_if $ok
        (i32.eq (local.get $rc) (i32.load8_u (i32.const 57)))
      )
      (unreachable)
    )
  )
)
