const assert = require("node:assert/strict");
const { OperatorSpacingNormalizer } = require("../dist/domain/operatorSpacing/OperatorSpacingNormalizer");
const { TypeCastSpacingNormalizer } = require("../dist/domain/typeCastSpacing/TypeCastSpacingNormalizer");

/**
 * Applies offset-based edits from the end of the document to the beginning.
 */
function applyEdits(text, edits) {
  let output = text;

  for (const edit of edits.slice().reverse()) {
    output = output.slice(0, edit.startOffset) + edit.replacement + output.slice(edit.endOffset);
  }

  return output;
}

/**
 * Returns a single range that covers every line in the sample text.
 */
function allLines(text) {
  return [{ startLine: 1, endLine: text.split("\n").length }];
}

const operatorSpacing = new OperatorSpacingNormalizer();
const typeCastSpacing = new TypeCastSpacingNormalizer();

const cases = [
  {
    name: "preserves leading boolean operator indentation",
    normalizer: operatorSpacing,
    input: `<?php
if (
            1 == 2
            ||    2 === 3
        ) {
        }
`,
    expected: `<?php
if (
            1 == 2
            || 2 === 3
        ) {
        }
`,
  },
  {
    name: "formats spaceship operator as one token",
    normalizer: operatorSpacing,
    input: `<?php
$result=$a<=>$b;
`,
    expected: `<?php
$result = $a <=> $b;
`,
  },
  {
    name: "does not break compound operators not handled by the rule",
    normalizer: operatorSpacing,
    input: `<?php
$a+=$b;
$c??=$d;
`,
    expected: `<?php
$a+=$b;
$c??=$d;
`,
  },
  {
    name: "skips strings and comments for operators",
    normalizer: operatorSpacing,
    input: `<?php
$s = '$a  =>  $b';
// $a  ===  $b
$a=>  $b;
`,
    expected: `<?php
$s = '$a  =>  $b';
// $a  ===  $b
$a => $b;
`,
  },
  {
    name: "skips heredoc content for operators",
    normalizer: operatorSpacing,
    input: `<?php
$sql = <<<SQL
where a        = b
SQL;
$a=>$b;
`,
    expected: `<?php
$sql = <<<SQL
where a        = b
SQL;
$a => $b;
`,
  },
  {
    name: "formats common type casts",
    normalizer: typeCastSpacing,
    input: `<?php
$a=( int )$input;
$b=(STRING)   $name;
`,
    expected: `<?php
$a=(int) $input;
$b=(string) $name;
`,
  },
  {
    name: "skips type casts at line end",
    normalizer: typeCastSpacing,
    input: `<?php
$a = (int)   
    $value;
$b = ( string );
`,
    expected: `<?php
$a = (int)   
    $value;
$b = ( string );
`,
  },
  {
    name: "skips strings and comments for type casts",
    normalizer: typeCastSpacing,
    input: `<?php
$s = '( int )$x';
// $a = ( string )$x
$a = ( bool )$flag;
`,
    expected: `<?php
$s = '( int )$x';
// $a = ( string )$x
$a = (bool) $flag;
`,
  },
];

for (const item of cases) {
  const actual = applyEdits(item.input, item.normalizer.buildEdits(item.input, allLines(item.input)));
  assert.equal(actual, item.expected, item.name);
  console.log(`PASS ${item.name}`);
}
