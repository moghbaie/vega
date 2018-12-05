var tape = require('tape'),
    dataflow = require('dataflow'),
    parse = require('../').dataflow;

tape('Parser parses Dataflow specs', function(test) {
  var values = [
    {"x": 1,  "y": 28},
    {"x": 2,  "y": 43},
    {"x": 3,  "y": 81},
    {"x": 4,  "y": 19}
  ];
  var spec = [
    {id:0, type:'Operator', value:500},
    {id:1, type:'Operator', value:300},
    {id:2, type:'Collect',  value:values},
    {id:3, type:'Aggregate', params:{groupby:{$field:'x'}, pulse:{$ref:2}}},
    {id:4, type:'Values', params:{field:{$field:'x'}, pulse:{$ref:3}}},
    {id:5, type:'Scale', params:{type:'band', range:[0,{$ref:0}], domain:{$ref:4}}},
    {id:6, type:'Extent', params:{field:{$field:'y'}, pulse:{$ref:2}}},
    {id:7, type:'Scale', params:{type:'linear', range:[{$ref:1},0], domain:{$ref:6}}}
  ];

  var df = new dataflow.Dataflow(),
      ctx = parse(spec, df),
      ops = ctx.operators;

  test.equal(Object.keys(ctx.fields).length, 2);
  test.equal(Object.keys(ops).length, spec.length);

  test.equal(df.run(), spec.length);

  test.equal(ops[0].value, 500);

  test.equal(ops[1].value, 300);

  test.equal(ops[2].value.length, values.length);

  test.equal(Object.keys(ops[3].value).length, values.length);

  test.deepEqual(ops[4].value, [1, 2, 3, 4]);

  var sx = ops[5].value;
  test.deepEqual(sx.domain(), [1, 2, 3, 4]);
  test.deepEqual(sx.range(), [0, 500]);

  test.deepEqual(ops[6].value, [19, 81]);

  var sy = ops[7].value;
  test.deepEqual(sy.domain(), [19, 81]);
  test.deepEqual(sy.range(), [300, 0]);

  test.end();
});