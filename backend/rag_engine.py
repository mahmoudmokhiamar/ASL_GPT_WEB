import os
import traceback
from constants import *
from langchain.prompts import ChatPromptTemplate
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI

if not os.getenv("OPENAI_API_KEY"):
    os.environ["OPENAI_API_KEY"] = API_KEY

try:
    embedding_function = OpenAIEmbeddings()
    db = Chroma(persist_directory=CHROMA_PATH, embedding_function=embedding_function)
    model = ChatOpenAI()
    prompt_template = ChatPromptTemplate.from_template(PROMPT_TEMPLATE)
except Exception as init_error:
    print("Error initializing RAG engine:")
    traceback.print_exc()
    raise init_error

def get_answer(query: str) -> str:
    try:
        results = db.similarity_search_with_relevance_scores(query, k=3)
        if not results or results[0][1] < 0.5:
            return " Sorry, I couldn't find a confident answer for that question."

        context_text = "\n\n---\n\n".join([doc.page_content for doc, _ in results])
        prompt = prompt_template.format(context=context_text, question=query)
        response = model.invoke(prompt)
        return str(response.content)  
    except Exception as e:
        print("Error while generating response:")
        traceback.print_exc()
        return "Internal error occurred while answering the question."