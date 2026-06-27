from datasets import load_dataset

category = "Amazon_Fashion"

reviews = load_dataset(
    "McAuley-Lab/Amazon-Reviews-2023",
    f"raw_review_{category}",
    split="full",
    streaming=True,
    trust_remote_code=True
)

for review in reviews.take(3):
    print(review)