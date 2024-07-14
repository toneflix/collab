/* eslint-disable @typescript-eslint/no-explicit-any */

type PNode<T> = {
  value: T;
  next: PNode<T> | null;
  prev: PNode<T> | null;
};

class SystemPlaylist<T> {
  private _id: number | string = new Date().getTime();
  private nodes: PNode<T>[];

  constructor(param?: T[], id?: string) {
    this.nodes = [];

    if (param) {
      this.insertItems(param, true)
    }

    if (id) {
      this._id = id
    }
  }

  get id (): number | string | undefined {
    return this._id;
  }

  set id (id: number | string) {
    this._id = id;
  }

  get size (): number {
    return this.nodes.length;
  }

  get head (): PNode<T> | null {
    return this.size ? this.nodes[0] : null;
  }

  get tail (): PNode<T> | null {
    return this.size ? this.nodes[this.size - 1] : null;
  }

  get items (): T[] {
    return [...this.nodes.map(e => e.value)];
  }

  insertAt (index: number, value: T): void {
    const previousNode = this.nodes[index - 1] || null;
    const nextNode = this.nodes[index] || null;
    const node: PNode<T> = { value, next: nextNode, prev: previousNode };

    if (previousNode) previousNode.next = node;
    this.nodes.splice(index, 0, node);
  }

  insertFirst (value: T): void {
    this.insertAt(0, value);
  }

  insertLast (value: T): void {
    this.insertAt(this.size, value);
  }

  insertItems (param: T[], fresh: boolean = false): void {
    if (fresh) {
      this.nodes = [];
    }
    param.forEach(value => this.insertLast(value));
  }

  getAt (index: number): PNode<T> | undefined {
    return this.nodes[index];
  }

  removeAt (index: number): PNode<T>[] {
    const previousNode = this.nodes[index - 1];
    const nextNode = this.nodes[index + 1] || null;

    if (previousNode) previousNode.next = nextNode;

    return this.nodes.splice(index, 1);
  }

  clear (): void {
    this.nodes = [];
  }

  filter (predicate: (
    value: any
  ) => boolean) {
    this.nodes = this.nodes.filter(predicate);
    return this.nodes
  }

  find (predicate: (value: PNode<T>, index: number, obj: PNode<T>[]) => unknown): PNode<T> | undefined {
    return this.nodes.find(predicate as any);
  }

  reverse (): void {
    this.nodes = this.nodes.reduce<PNode<T>[]>(
      (acc, { value }, i) => [{ value, next: acc[0] || null, prev: acc[i - 1] }, ...acc],
      []
    );
  }

  shuffle (): void {
    this.nodes = this.nodes.sort(() => Math.random() - 0.5);
  }

  *[Symbol.iterator] (): IterableIterator<PNode<T>> {
    yield* this.nodes;
  }
}

export default SystemPlaylist
