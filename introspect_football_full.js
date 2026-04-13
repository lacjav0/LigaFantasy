const { request, gql } = require('graphql-request');
const fs = require('fs');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const SORARE_API_URL = 'https://api.sorare.com/graphql';

const INTROSPECT = gql`
  query Introspect {
    __type(name: "FootballQuery") {
      name
      fields {
        name
      }
    }
  }
`;

async function test() {
    try {
        const data = await request(SORARE_API_URL, INTROSPECT);
        fs.writeFileSync('football_query_fields.json', JSON.stringify(data.__type.fields, null, 2));
        console.log('Fields saved');
    } catch (e) {
        console.error(e.message);
    }
}

test();
