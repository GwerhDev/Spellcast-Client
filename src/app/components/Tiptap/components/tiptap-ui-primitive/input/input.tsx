import { cn } from "../../../lib/tiptap-utils"
import s from "../../../components/tiptap-ui-primitive/input/input.module.css"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input type={type} className={cn("tiptap-input", className)} {...props} />
  )
}

function InputGroup({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn(s["tiptap-input-group"], className)} {...props}>
      {children}
    </div>
  )
}

export { Input, InputGroup }
