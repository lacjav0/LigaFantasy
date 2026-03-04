const { request, gql } = require('graphql-request');
const fs = require('fs');
const SORARE_API_URL = 'https://api.sorare.com/graphql';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const INTROSPECTION_QUERY = gql`
  query {
    __schema {
      queryType {
        fields {
          name
        }
      }
    }
  }
`;

async function introspect() {
    try {
        const data = await request(SORARE_API_URL, INTROSPECTION_QUERY);
        const fields = data.__schema.queryType.fields.map(f => f.name);
        fs.writeFileSync('root_fields_list.txt', fields.join('\n'));
        console.log('SUCCESS');
    } catch (error) {
        console.error('ERROR:', error.message);
    }
}

introspect();
