;; Smallest possible contract: deploy and call both no-op.
(module
  (import "env" "memory" (memory 1 1))
  (func (export "deploy"))
  (func (export "call"))
)
