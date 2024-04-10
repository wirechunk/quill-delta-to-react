import { ListType, DataType } from './value-types.js';
import type { OpAttributes } from './OpAttributeSanitizer.js';
import { InsertData, InsertDataCustom, InsertDataQuill } from './InsertData.js';
import isEqual from 'lodash.isequal';
import { newLine } from './constants.js';

export class DeltaInsertOp<Insert extends InsertData = InsertData> {
  constructor(
    readonly insert: Insert,
    readonly attributes: OpAttributes = {},
  ) {}

  static createNewLineOp() {
    return new DeltaInsertOp(new InsertDataQuill(DataType.Text, newLine));
  }

  isContainerBlock() {
    return (
      this.isBlockquote() ||
      this.isList() ||
      this.isTable() ||
      this.isCodeBlock() ||
      this.isHeader() ||
      this.isBlockAttribute() ||
      this.isCustomTextBlock()
    );
  }

  isBlockAttribute() {
    const attrs = this.attributes;
    return !!(attrs.align || attrs.direction || attrs.indent);
  }

  isBlockquote(): boolean {
    return !!this.attributes.blockquote;
  }

  isHeader(): boolean {
    return !!this.attributes.header;
  }

  isTable(): boolean {
    return !!this.attributes.table;
  }

  isSameHeaderAs(op: DeltaInsertOp): boolean {
    return op.attributes.header === this.attributes.header && this.isHeader();
  }

  // adi: align, direction, indent
  hasSameAdiAs(op: DeltaInsertOp) {
    return (
      this.attributes.align === op.attributes.align &&
      this.attributes.direction === op.attributes.direction &&
      this.attributes.indent === op.attributes.indent
    );
  }

  hasSameIndentationAs(op: DeltaInsertOp) {
    return this.attributes.indent === op.attributes.indent;
  }

  hasSameAttr(op: DeltaInsertOp) {
    return isEqual(this.attributes, op.attributes);
  }

  isInline() {
    return (
      !this.isContainerBlock() &&
      (this.insert instanceof InsertDataQuill
        ? this.insert.type !== DataType.Video
        : !this.attributes.renderAsBlock)
    );
  }

  isCodeBlock() {
    return !!this.attributes['code-block'];
  }

  hasSameLangAs(op: DeltaInsertOp) {
    return this.attributes['code-block'] === op.attributes['code-block'];
  }

  isJustNewline() {
    return this.insert.value === newLine;
  }

  isList() {
    return (
      this.isOrderedList() ||
      this.isBulletList() ||
      this.isCheckedList() ||
      this.isUncheckedList()
    );
  }

  isOrderedList() {
    return this.attributes.list === ListType.Ordered;
  }

  isBulletList() {
    return this.attributes.list === ListType.Bullet;
  }

  isCheckedList() {
    return this.attributes.list === ListType.Checked;
  }

  isUncheckedList() {
    return this.attributes.list === ListType.Unchecked;
  }

  isACheckList() {
    return (
      this.attributes.list == ListType.Unchecked ||
      this.attributes.list === ListType.Checked
    );
  }

  isSameListAs(op: DeltaInsertOp): boolean {
    return (
      !!op.attributes.list &&
      (this.attributes.list === op.attributes.list ||
        (op.isACheckList() && this.isACheckList()))
    );
  }

  isSameTableRowAs(op: DeltaInsertOp): boolean {
    return (
      op.isTable() &&
      this.isTable() &&
      this.attributes.table === op.attributes.table
    );
  }

  isText(): this is DeltaInsertOp<InsertDataQuill<DataType.Text>> {
    return (
      this.insert instanceof InsertDataQuill &&
      this.insert.type === DataType.Text
    );
  }

  isImage() {
    return (
      this.insert instanceof InsertDataQuill &&
      this.insert.type === DataType.Image
    );
  }

  isFormula(): this is DeltaInsertOp<InsertDataQuill<DataType.Text>> {
    return (
      this.insert instanceof InsertDataQuill &&
      this.insert.type === DataType.Formula
    );
  }

  isVideo(): this is DeltaInsertOp<InsertDataQuill<DataType.Video>> {
    return (
      this.insert instanceof InsertDataQuill &&
      this.insert.type === DataType.Video
    );
  }

  isLink() {
    return this.isText() && !!this.attributes.link;
  }

  isCustomEmbed(): this is DeltaInsertOp<InsertDataCustom> {
    return this.insert instanceof InsertDataCustom;
  }

  isCustomEmbedBlock(): this is DeltaInsertOp<InsertDataCustom> {
    return this.isCustomEmbed() && !!this.attributes.renderAsBlock;
  }

  isCustomTextBlock() {
    return this.isText() && !!this.attributes.renderAsBlock;
  }

  isMentions(): this is DeltaInsertOp<InsertDataQuill<DataType.Text>> {
    return this.isText() && !!this.attributes.mentions;
  }
}
