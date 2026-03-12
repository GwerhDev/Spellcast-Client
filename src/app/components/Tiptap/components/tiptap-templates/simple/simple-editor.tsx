import { ReactElement, useRef } from "react"
import { EditorContent, EditorContext, JSONContent, useEditor } from "@tiptap/react"

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit"
import { Image } from "@tiptap/extension-image"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TextAlign } from "@tiptap/extension-text-align"
import { Typography } from "@tiptap/extension-typography"
import { Highlight } from "@tiptap/extension-highlight"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"
import { Selection } from "@tiptap/extensions"

// --- UI Primitives ---
import {
  Toolbar,
  ToolbarGroup,
} from "../../tiptap-ui-primitive/toolbar"

// --- Tiptap Node ---
import { ImageUploadNode } from "../../tiptap-node/image-upload-node/image-upload-node-extension"
import { HorizontalRule } from "../../tiptap-node/horizontal-rule-node/horizontal-rule-node-extension"

// --- Tiptap UI ---
import { HeadingDropdownMenu } from "../../tiptap-ui/heading-dropdown-menu"
import { ImageUploadButton } from "../../tiptap-ui/image-upload-button"
import { ListDropdownMenu } from "../../tiptap-ui/list-dropdown-menu"
import { BlockquoteButton } from "../../tiptap-ui/blockquote-button"
import { CodeBlockButton } from "../../tiptap-ui/code-block-button"
import {
  ColorHighlightPopover,
} from "../../tiptap-ui/color-highlight-popover"
import {
  LinkPopover,
} from "../../tiptap-ui/link-popover"
import { MarkButton } from "../../tiptap-ui/mark-button"
import { TextAlignButton } from "../../tiptap-ui/text-align-button"
import { UndoRedoButton } from "../../tiptap-ui/undo-redo-button"

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from "../../../lib/tiptap-utils"

// --- Styles ---
import s from "./simple-editor.module.css"
import "../../tiptap-node/code-block-node/code-block-node.module.css"
import "../../tiptap-node/horizontal-rule-node/horizontal-rule-node.module.css"
import "../../tiptap-node/list-node/list-node.module.css"
import "../../tiptap-node/image-node/image-node.module.css"
import "../../tiptap-node/heading-node/heading-node.module.css"
import "../../tiptap-node/paragraph-node/paragraph-node.module.css"

const MainToolbarContent = () => {
  return (
    <>
      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
        <HeadingDropdownMenu levels={[1, 2, 3, 4]} />
        <ListDropdownMenu
          types={["bulletList", "orderedList", "taskList"]}
        />
        <BlockquoteButton />
        <CodeBlockButton />
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        <MarkButton type="underline" />
        <ColorHighlightPopover />
        <LinkPopover />
        <MarkButton type="superscript" />
        <MarkButton type="subscript" />
        <TextAlignButton align="left" />
        <TextAlignButton align="center" />
        <TextAlignButton align="right" />
        <TextAlignButton align="justify" />
        <ImageUploadButton text="Add" />
      </ToolbarGroup>

    </>
  )
}

export function SimpleEditor({ children, content, onContentChange, isEditable }: { children?: ReactElement, content: JSONContent, onContentChange: (content: JSONContent) => void, isEditable?: boolean }) {
  const toolbarRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    editable: isEditable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Main content area, start typing to enter text.",
        class: "simple-editor",
      },
    },
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: {
          openOnClick: false,
          enableClickSelection: true,
        },
      }),
      HorizontalRule,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      Typography,
      Superscript,
      Subscript,
      Selection,
      ImageUploadNode.configure({
        accept: "image/*",
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: handleImageUpload,
        onError: (error) => console.error("Upload failed:", error),
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onContentChange(editor.getJSON());
    }
  }, [isEditable]);

  if (!isEditable) return (
    <>
      {children}
    </>
  )

  return (
    <div className={s["simple-editor-wrapper"]}>
      <EditorContext.Provider value={{ editor }}>
        <Toolbar ref={toolbarRef} >
          <MainToolbarContent />
        </Toolbar>
        <EditorContent
          editor={editor}
          role="presentation"
          className={s["simple-editor-content"]}
        />
      </EditorContext.Provider>
    </div>
  )
}
