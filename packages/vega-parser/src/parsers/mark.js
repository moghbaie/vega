import parseMarkDefinition from './markDefinition';
import parseEncode from './encode';
import {ref, transform} from '../util';

// TODO: facet, pre/post-transforms, reactive geometry
export default function parseMark(mark, scope) {
  var op, markRef, boundRef, key, params, enc, children;

  // add data join to map tuples to visual items
  op = scope.add(transform('DataJoin', {
    key:   mark.key ? scope.fieldRef(mark.key) : undefined,
    pulse: mark.from.$ref ? mark.from
            : ref(scope.getData(mark.from.data).output)
  }));

  // collect visual items, sort as requested
  op = scope.add(transform('Collect', {
    sort:  mark.sort ? scope.compareRef(mark.sort) : undefined,
    pulse: ref(op)
  }));

  // connect visual items to scenegraph
  markRef = ref(op = scope.add(transform('Mark', {
    markdef: parseMarkDefinition(mark),
    scenepath: scope.scenepathNext(),
    pulse: ref(op)
  })));

  // add visual encoders (if defined)
  if (mark.encode) {
    enc = {};
    params = {encoders: {$encode: enc}};
    for (key in mark.encode) {
      enc[key] = parseEncode(mark.encode[key], params, scope);
    }
    params.pulse = markRef;
    op = scope.add(transform('Encode', params));
  }

  // recurse if group mark
  if (mark.type === 'group') {
    scope.scenepathPush();
    children = mark.marks.map(function(child) {
      return parseMark(child, scope);
    });
    scope.scenepathPop();
  }

  // TODO: post-encoding transforms

  // compute bounding boxes
  boundRef = ref(scope.add(transform('Bound', {
    mark: markRef,
    pulse: ref(op),
    children: children
  })));

  // render marks
  scope.add(transform('Render', {pulse: boundRef}));

  // propagate value changes
  return ref(scope.add(transform('Sieve', {pulse: boundRef})));
}
