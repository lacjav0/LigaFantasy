const { request, gql } = require('graphql-request');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const SORARE_API_URL = 'https://api.sorare.com/graphql';

const INTROSPECT_QUERY = gql`
  query Introspect {
    __type(name: "FootballQuery") {
      name
      fields {
        name
        type {
          name
          kind
        }
      }
    }
  }
`;

async function test() {
    try {
        const data = await request(SORARE_API_URL, INTROSPECT_QUERY);
        console.log('FootballQuery Fields:', JSON.stringify(data.__type.fields, null, 2));
    } catch (error) {
        console.error('Introspection Failed:', error.message);
    }
}

test();
