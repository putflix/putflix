export async function collect<T>(it: AsyncIterable<T> | Iterable<T>): Promise<T[]> {
    const elts = [];
    for await (const elt of it) {
        elts.push(elt);
    }
    return elts;
}
