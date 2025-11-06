export interface BlockFieldConfig {
  name: string;
  type: "string" | "url" | "enum" | "number";
  label: string;
  required: boolean;
  placeholder?: string;
  maxLength?: number;
  minLength?: number;
  options?: string[];
  description?: string;
}

export interface BlockTypeConfig {
  type: string;
  label: string;
  description: string;
  icon: string;
  fields: BlockFieldConfig[];
}

export const BLOCK_TYPES_CONFIG: BlockTypeConfig[] = [
  {
    type: "link",
    label: "Link Button",
    description: "Add a clickable button with a URL",
    icon: "🔗",
    fields: [
      {
        name: "url",
        type: "url",
        label: "URL",
        required: true,
        placeholder: "https://example.com",
        description: "The destination URL",
      },
      {
        name: "title",
        type: "string",
        label: "Button Text",
        required: true,
        minLength: 1,
        maxLength: 100,
        placeholder: "Click here",
        description: "Text displayed on the button",
      },
      {
        name: "icon",
        type: "string",
        label: "Icon",
        required: false,
        placeholder: "🎨",
        description: "Optional emoji or icon",
      },
      {
        name: "style",
        type: "enum",
        label: "Button Style",
        required: false,
        options: ["default", "outline", "shadow"],
        description: "Visual style of the button",
      },
    ],
  },
  {
    type: "text",
    label: "Text Block",
    description: "Add a paragraph of text",
    icon: "📝",
    fields: [
      {
        name: "content",
        type: "string",
        label: "Text Content",
        required: true,
        minLength: 1,
        maxLength: 1000,
        placeholder: "Enter your text here...",
        description: "The text content to display",
      },
      {
        name: "alignment",
        type: "enum",
        label: "Text Alignment",
        required: false,
        options: ["left", "center", "right"],
        description: "How to align the text",
      },
      {
        name: "fontSize",
        type: "enum",
        label: "Font Size",
        required: false,
        options: ["small", "medium", "large"],
        description: "Size of the text",
      },
    ],
  },
  {
    type: "header",
    label: "Header",
    description: "Add a heading or title",
    icon: "📌",
    fields: [
      {
        name: "text",
        type: "string",
        label: "Header Text",
        required: true,
        minLength: 1,
        maxLength: 200,
        placeholder: "Section Title",
        description: "The header text",
      },
      {
        name: "level",
        type: "enum",
        label: "Header Level",
        required: false,
        options: ["1", "2", "3"],
        description: "Size/importance of the header (1=largest, 3=smallest)",
      },
      {
        name: "alignment",
        type: "enum",
        label: "Text Alignment",
        required: false,
        options: ["left", "center", "right"],
        description: "How to align the header",
      },
    ],
  },
];
