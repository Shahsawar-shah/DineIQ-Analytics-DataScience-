"""
DineIQ Analytics - Synthetic Dataset Generator

Generates the raw CSV datasets used across the DineIQ pipeline:
menu categories, menu items, restaurants, customers, promotions,
pricing history, orders, order items, ratings, inventory, and wastage.
"""

from faker import Faker
import numpy as np
import pandas as pd
import random
import os
from pathlib import Path


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
NUM_CATEGORIES = 10
NUM_MENU_ITEMS = 150
NUM_RESTAURANTS = 20
NUM_CUSTOMERS = 50000
NUM_ORDERS = 100000
NUM_ORDER_ITEMS = 1000000
NUM_RATINGS = 100000
NUM_WASTAGE = 50000
RANDOM_SEED = 42
OUTPUT_DIR = "raw_data/"


# ---------------------------------------------------------------------------
# Table generators
# ---------------------------------------------------------------------------
def generate_menu_categories():
    pass


def generate_menu_items():
    pass


def generate_restaurants():
    pass


def generate_customers():
    pass


def generate_promotions():
    pass


def generate_pricing_history():
    pass


def generate_orders():
    pass


def generate_order_items():
    pass


def generate_ratings():
    pass


def generate_inventory():
    pass


def generate_wastage():
    pass


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def save_to_csv(df, filename):
    pass


def print_summary():
    pass


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("DineIQ Dataset Generator Starting...")
    # calls to each function will go here
    print("Done!")


if __name__ == "__main__":
    main()
